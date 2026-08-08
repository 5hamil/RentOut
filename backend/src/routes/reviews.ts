import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { protect, AuthRequest } from '../middleware/auth';
import { BookingStatus } from '@prisma/client';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();

const createReviewSchema = z.object({
  body: z.object({
    bookingId: z.string().uuid('Valid booking ID required.'),
    rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5.'),
    comment: z.string().min(1, 'Comment is required.')
  })
});

router.post('/', protect, validate(createReviewSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { bookingId, rating, comment } = req.body;
  const reviewerId = req.userId!;

  try {
    // 1. Find booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    // 2. Ensure booking is completed
    if (booking.status !== BookingStatus.completed) {
      res.status(400).json({ message: 'You can only review completed bookings.' });
      return;
    }

    // 3. Ensure user is part of the booking
    if (booking.renterId !== reviewerId && booking.ownerId !== reviewerId) {
      res.status(403).json({ message: 'You are not authorized to review this booking.' });
      return;
    }

    const revieweeId = booking.renterId === reviewerId ? booking.ownerId : booking.renterId;

    // 4. Ensure user hasn't already left a review
    const existingReview = await prisma.review.findUnique({
      where: {
        bookingId_reviewerId: {
          bookingId,
          reviewerId
        }
      }
    });

    if (existingReview) {
      res.status(400).json({ message: 'You have already left a review for this booking.' });
      return;
    }

    // 5. Create review and update user's average rating transactionally
    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          bookingId,
          reviewerId,
          revieweeId,
          rating,
          comment
        }
      });

      const avgQuery = await tx.review.aggregate({
        where: { revieweeId },
        _avg: { rating: true }
      });

      if (avgQuery._avg.rating) {
        await tx.user.update({
          where: { id: revieweeId },
          data: { avgRating: avgQuery._avg.rating }
        });
      }
    });

    res.status(201).json({ message: 'Review submitted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
