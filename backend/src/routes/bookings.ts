import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { protect, requireVerified, AuthRequest } from '../middleware/auth';
import { BookingStatus, DepositStatus, ListingStatus } from '@prisma/client';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { bookingLimiter } from '../lib/rateLimiters';

const router = Router();

// ─── POST /api/bookings — create a booking request ────────────────────────────

const createBookingSchema = z.object({
  body: z.object({
    listingId: z.string().uuid('Invalid listing ID.'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format.' }),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format.' }),
  }).refine(data => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date.',
    path: ['endDate']
  })
});

router.post('/', protect, bookingLimiter, validate(createBookingSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {

  const { listingId, startDate, endDate } = req.body;
  const reqStart = new Date(startDate);
  const reqEnd = new Date(endDate);

  try {
    // 1. Fetch listing and its existing confirmed/ongoing bookings
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        bookings: {
          where: {
            status: { in: [BookingStatus.confirmed, BookingStatus.ongoing] }
          },
          select: { startDate: true, endDate: true }
        }
      }
    });

    if (!listing) {
      res.status(404).json({ message: 'Listing not found.' });
      return;
    }

    if (listing.status !== ListingStatus.active) {
      res.status(400).json({ message: 'This listing is not currently active.' });
      return;
    }

    // 2. Prevent booking own listing
    if (listing.ownerId === req.userId) {
      res.status(400).json({ message: 'You cannot book your own listing.' });
      return;
    }

    // 3. Check if requested dates fall within the overall availability window
    if (reqStart < listing.availabilityStart || reqEnd > listing.availabilityEnd) {
      res.status(400).json({ message: 'Requested dates fall outside the listing\'s available window.' });
      return;
    }

    // 4. Overlap Check: blockedDates
    const hasBlockedOverlap = listing.blockedDates.some(blocked => {
      const bTime = blocked.getTime();
      return bTime >= reqStart.getTime() && bTime <= reqEnd.getTime();
    });

    if (hasBlockedOverlap) {
      res.status(400).json({ message: 'Some of the requested dates are blocked by the owner.' });
      return;
    }

    // 5. Overlap Check: existing bookings
    // Two ranges (StartA, EndA) and (StartB, EndB) overlap if: StartA < EndB AND EndA > StartB
    // We'll treat rental days as inclusive (e.g. rent from Monday to Tuesday overlaps if someone booked Monday or Tuesday)
    const hasBookingOverlap = listing.bookings.some(booking => {
      return (reqStart <= booking.endDate && reqEnd >= booking.startDate);
    });

    if (hasBookingOverlap) {
      res.status(400).json({ message: 'Some of the requested dates are already booked.' });
      return;
    }

    // 6. Calculate Pricing
    // Calculate full days. Math.ceil is safer for potential timezone quirks, but since we use ISO strings at 00:00:00Z, simple subtraction works.
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = reqEnd.getTime() - reqStart.getTime();
    // Inclusive counting: renting 20th to 20th is 1 day. 20th to 21st is 2 days.
    const days = Math.round(diffMs / msPerDay) + 1;
    
    if (days < 1) {
      res.status(400).json({ message: 'Invalid date range.' });
      return;
    }

    const pricePerDay = Number(listing.pricePerDay);
    const depositAmount = Number(listing.depositAmount);
    const totalPrice = days * pricePerDay;

    // 7. Create the booking request
    const booking = await prisma.booking.create({
      data: {
        listingId,
        renterId: req.userId!,
        ownerId: listing.ownerId,
        startDate: reqStart,
        endDate: reqEnd,
        totalPrice,
        depositAmount,
        status: BookingStatus.requested,
        depositStatus: DepositStatus.held // assuming payment processor holds it upon request
      }
    });

    res.status(201).json({ message: 'Booking request sent successfully.', booking });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/bookings/owner — get bookings where user is owner ─────────────

router.get('/owner', protect, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { ownerId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { id: true, title: true, images: true } },
        renter: { select: { id: true, name: true, profileImage: true, avgRating: true } },
        reviews: true,
        dispute: true
      }
    });
    res.status(200).json({ bookings });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/bookings/renter — get bookings where user is renter ───────────

router.get('/renter', protect, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { renterId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { id: true, title: true, images: true } },
        owner: { select: { id: true, name: true, profileImage: true, avgRating: true } },
        reviews: true,
        dispute: true
      }
    });
    res.status(200).json({ bookings });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/bookings/:id/status — accept or decline a booking request ──────

const updateStatusSchema = z.object({
  body: z.object({
    action: z.enum(['accept', 'decline', 'complete'], {
      message: 'Action must be accept, decline, or complete.'
    })
  })
});

router.put('/:id/status', protect, validate(updateStatusSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { action } = req.body;

  try {
    // 1. Find booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { listing: true, renter: true }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    // 2. Ensure current user is the owner
    if (booking.ownerId !== req.userId) {
      res.status(403).json({ message: 'Only the owner can manage this booking.' });
      return;
    }

    // 3. Handle Actions
    if (action === 'decline') {
      if (booking.status !== BookingStatus.requested) {
        res.status(400).json({ message: 'Can only decline a requested booking.' });
        return;
      }
      const updated = await prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.cancelled }
      });
      res.status(200).json({ message: 'Booking declined.', booking: updated });
      return;
    }

    if (action === 'accept') {
      if (booking.status !== BookingStatus.requested) {
        res.status(400).json({ message: 'Can only accept a requested booking.' });
        return;
      }
      
      const existingOverlap = await prisma.booking.findFirst({
        where: {
          listingId: booking.listingId,
          status: { in: [BookingStatus.confirmed, BookingStatus.ongoing] },
          startDate: { lte: booking.endDate },
          endDate: { gte: booking.startDate }
        }
      });

      if (existingOverlap) {
        res.status(400).json({ message: 'Another booking was already confirmed for these dates.' });
        return;
      }

      const [updatedBooking] = await prisma.$transaction([
        prisma.booking.update({
          where: { id },
          data: {
            status: BookingStatus.confirmed,
            depositStatus: DepositStatus.held
          }
        }),
        prisma.message.create({
          data: {
            bookingId: id,
            senderId: req.userId!,
            content: `Hi ${booking.renter.name}! I've accepted your booking request for ${booking.listing.title}. Let's coordinate pickup.`
          }
        })
      ]);

      res.status(200).json({ message: 'Booking accepted.', booking: updatedBooking });
      return;
    }

    if (action === 'complete') {
      const allowedStatuses: BookingStatus[] = [BookingStatus.confirmed, BookingStatus.ongoing];
      if (!allowedStatuses.includes(booking.status)) {
        res.status(400).json({ message: 'Only confirmed or ongoing bookings can be marked as complete.' });
        return;
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { 
          status: BookingStatus.completed,
          depositStatus: DepositStatus.released // conceptually returned deposit upon completion
        }
      });

      res.status(200).json({ message: 'Booking marked as completed.', booking: updated });
      return;
    }

  } catch (err) {
    next(err);
  }
});

export default router;
