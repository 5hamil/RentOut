import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { protect, requireAdmin, AuthRequest } from '../middleware/auth';
import { VerificationStatus } from '@prisma/client';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();

// ─── GET /api/admin/verifications — view pending verifications ────────────────

router.get('/verifications', protect, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { verificationStatus: VerificationStatus.pending },
      select: {
        id: true,
        name: true,
        email: true,
        idDocumentUrl: true,
        createdAt: true,
        resubmissionCount: true
      },
      orderBy: { updatedAt: 'asc' } // Oldest pending first
    });

    const { v2: cloudinary } = require('cloudinary');

    const mappedUsers = pendingUsers.map(user => {
      let signedUrl = user.idDocumentUrl;
      if (signedUrl && signedUrl.includes('cloudinary.com')) {
        // Extract public_id from full URL: e.g. "paperrentel_ids/abcd123"
        // URL format: https://res.cloudinary.com/<cloud>/image/upload/v1234/paperrentel_ids/abcd123.jpg
        const parts = signedUrl.split('/');
        const filePart = parts.pop() || '';
        const folderPart = parts.pop() || '';
        const publicId = `${folderPart}/${filePart.split('.')[0]}`;
        
        // Generate a signed URL valid for 1 hour
        signedUrl = cloudinary.utils.url(publicId, {
          type: 'private',
          sign_url: true,
          secure: true
        });
      }
      return { ...user, idDocumentUrl: signedUrl };
    });

    res.status(200).json({ users: mappedUsers });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/admin/verifications/:userId — approve or reject ──────────────────

const verificationActionSchema = z.object({
  body: z.object({
    action: z.enum(['approve', 'reject'], { message: 'Action must be approve or reject.' })
  })
});

router.put('/verifications/:userId', protect, requireAdmin, validate(verificationActionSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { userId } = req.params;
  const { action } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (action === 'approve') {
      await prisma.user.update({
        where: { id: userId },
        data: { verificationStatus: VerificationStatus.verified }
      });
      res.status(200).json({ message: 'User verified successfully.' });
      return;
    }

    if (action === 'reject') {
      // Check if user has already been rejected once (resubmissionCount === 1)
      if (user.resubmissionCount >= 1) {
        await prisma.user.update({
          where: { id: userId },
          data: { verificationStatus: VerificationStatus.permanently_blocked }
        });
        res.status(200).json({ message: 'User permanently blocked after second rejection.' });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { 
            verificationStatus: VerificationStatus.rejected,
            resubmissionCount: 1 // Increment/set resubmission count
          }
        });
        res.status(200).json({ message: 'User verification rejected. They can re-upload once.' });
      }
      return;
    }
  } catch (err) {
    next(err);
  }
});

// ─── ADMIN DASHBOARD: STATS ────────────────────────────────────────────────────

router.get('/stats', protect, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const totalListings = await prisma.listing.count({ where: { status: 'active' } });
    const activeBookings = await prisma.booking.count({ where: { status: { in: ['confirmed', 'ongoing'] } } });

    // Revenue-to-be (transaction volume of active bookings)
    const bookings = await prisma.booking.findMany({
      where: { status: { in: ['confirmed', 'ongoing'] } },
      select: { totalPrice: true }
    });
    const projectedRevenue = bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);

    res.json({ totalUsers, totalListings, activeBookings, projectedRevenue });
  } catch (err) {
    next(err);
  }
});

// ─── ADMIN DASHBOARD: USERS ────────────────────────────────────────────────────

router.get('/users', protect, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search = '', page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = search ? {
      OR: [
        { name: { contains: String(search), mode: 'insensitive' as any } },
        { email: { contains: String(search), mode: 'insensitive' as any } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, isAdmin: true,
          isSuspended: true, verificationStatus: true,
          createdAt: true, isFlagged: true
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

const suspendUserSchema = z.object({
  body: z.object({
    isSuspended: z.boolean()
  })
});

router.put('/users/:id/suspend', protect, requireAdmin, validate(suspendUserSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isSuspended } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isSuspended: Boolean(isSuspended) },
      select: { id: true, isSuspended: true }
    });
    res.json({ message: 'User suspension status updated', user });
  } catch (err) {
    next(err);
  }
});

// ─── ADMIN DASHBOARD: LISTINGS ─────────────────────────────────────────────────

router.get('/listings', protect, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        include: { owner: { select: { name: true, email: true } } },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.listing.count()
    ]);

    res.json({ listings, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

const updateListingStatusSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'removed', 'paused'])
  })
});

router.put('/listings/:id/status', protect, requireAdmin, validate(updateListingStatusSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body;
    const listing = await prisma.listing.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json({ message: 'Listing status updated', listing });
  } catch (err) {
    next(err);
  }
});

// ─── ADMIN DASHBOARD: REPORTS ──────────────────────────────────────────────────

router.get('/reports', protect, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        include: { reporter: { select: { name: true, email: true } } },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.report.count()
    ]);

    res.json({ reports, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

const updateReportStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'reviewed', 'dismissed', 'actioned'])
  })
});

router.put('/reports/:id/status', protect, requireAdmin, validate(updateReportStatusSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body;
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json({ message: 'Report status updated', report });
  } catch (err) {
    next(err);
  }
});

// ─── ADMIN DASHBOARD: BOOKINGS ─────────────────────────────────────────────────

router.get('/bookings', protect, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        include: { 
          renter: { select: { name: true, email: true } },
          owner: { select: { name: true, email: true } },
          listing: { select: { title: true } }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.booking.count()
    ]);

    res.json({ bookings, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

// ─── ADMIN DASHBOARD: DISPUTES ────────────────────────────────────────────────

router.get('/disputes', protect, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [disputes, total] = await Promise.all([
      prisma.disputeClaim.findMany({
        include: {
          filedBy: { select: { id: true, name: true, email: true } },
          booking: { 
            include: {
              renter: { select: { id: true, name: true, email: true } },
              owner: { select: { id: true, name: true, email: true } },
              listing: { select: { id: true, title: true } }
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.disputeClaim.count()
    ]);

    res.json({ disputes, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

const resolveDisputeSchema = z.object({
  body: z.object({
    action: z.enum(['release', 'forfeit', 'partially_withhold']),
    amount: z.number().optional(),
    resolutionNotes: z.string().optional()
  })
});

router.put('/disputes/:id/resolve', protect, requireAdmin, validate(resolveDisputeSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { action, amount, resolutionNotes } = req.body;

    const dispute = await prisma.disputeClaim.findUnique({
      where: { id: req.params.id },
      include: { booking: true }
    });

    if (!dispute) {
      res.status(404).json({ message: 'Dispute not found.' });
      return;
    }

    if (dispute.status === 'resolved') {
      res.status(400).json({ message: 'Dispute is already resolved.' });
      return;
    }

    let depositStatus: any = 'held';
    let resolutionAmount = 0;

    if (action === 'release') {
      depositStatus = 'released'; // Full refund to renter
    } else if (action === 'forfeit') {
      depositStatus = 'forfeited'; // Full forfeit to owner
      resolutionAmount = Number(dispute.booking.depositAmount);
    } else if (action === 'partially_withhold') {
      depositStatus = 'partially_withheld';
      resolutionAmount = Number(amount);
      if (!resolutionAmount || resolutionAmount <= 0 || resolutionAmount > Number(dispute.booking.depositAmount)) {
        res.status(400).json({ message: 'Invalid partial withhold amount.' });
        return;
      }
    }

    // Atomic transaction to update both dispute and booking
    const result = await prisma.$transaction(async (tx) => {
      const updatedDispute = await tx.disputeClaim.update({
        where: { id: dispute.id },
        data: {
          status: 'resolved',
          resolutionNotes,
          depositResolutionAmount: resolutionAmount,
          resolvedAt: new Date()
        }
      });

      await tx.booking.update({
        where: { id: dispute.bookingId },
        data: {
          depositStatus,
          status: 'completed' // Force booking to completed once dispute is settled
        }
      });

      return updatedDispute;
    });

    // TODO: Trigger notification to both parties about the resolution
    
    res.json({ message: 'Dispute resolved successfully', dispute: result });
  } catch (err) {
    next(err);
  }
});

export default router;
