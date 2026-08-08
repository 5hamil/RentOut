import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { protect, AuthRequest } from '../middleware/auth';
import { uploadEvidence } from '../lib/cloudinary';
import { sendAdminNotification } from '../lib/email';

const router = Router();

// ─── POST /api/bookings/:id/dispute — File a new dispute ─────────────────────

router.post('/bookings/:bookingId/dispute', protect, uploadEvidence.array('images', 5), async (req: AuthRequest, res: Response): Promise<void> => {
  const { bookingId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ message: 'Reason is required.' });
    return;
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    if (booking.renterId !== req.userId && booking.ownerId !== req.userId) {
      res.status(403).json({ message: 'You are not a party to this booking.' });
      return;
    }

    if (!['completed', 'ongoing'].includes(booking.status)) {
      res.status(400).json({ message: 'Can only dispute ongoing or completed bookings.' });
      return;
    }

    const existingDispute = await prisma.disputeClaim.findUnique({
      where: { bookingId }
    });

    if (existingDispute) {
      res.status(400).json({ message: 'Dispute already filed for this booking.' });
      return;
    }

    // Extract image URLs
    const files = req.files as Express.Multer.File[];
    const imageUrls = files ? files.map(f => f.path) : [];

    // Create the dispute and update booking status atomically
    const result = await prisma.$transaction(async (tx) => {
      const dispute = await tx.disputeClaim.create({
        data: {
          bookingId,
          filedById: req.userId!,
          reason,
          evidenceImages: imageUrls,
          status: 'open'
        }
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'disputed' }
      });

      return dispute;
    });

    // Trigger notification to opposing party and Admin
    await sendAdminNotification(
      'New Dispute Filed',
      `A new dispute was filed by user ${req.userId} on booking ${bookingId}.\n\nReason: ${reason}`
    );
    
    res.status(201).json({ message: 'Dispute filed successfully', dispute: result });
  } catch (err) {
    console.error('[POST /api/bookings/:id/dispute]', err);
    res.status(500).json({ message: 'Failed to file dispute.' });
  }
});

// ─── POST /api/disputes/:id/counter — Counter-file evidence ──────────────────

router.post('/disputes/:disputeId/counter', protect, uploadEvidence.array('images', 5), async (req: AuthRequest, res: Response): Promise<void> => {
  const { disputeId } = req.params;
  const { opposingReason } = req.body;

  if (!opposingReason) {
    res.status(400).json({ message: 'Reason is required.' });
    return;
  }

  try {
    const dispute = await prisma.disputeClaim.findUnique({
      where: { id: disputeId },
      include: { booking: true }
    });

    if (!dispute) {
      res.status(404).json({ message: 'Dispute not found.' });
      return;
    }

    const isOwner = dispute.booking.ownerId === req.userId;
    const isRenter = dispute.booking.renterId === req.userId;

    if (!isOwner && !isRenter) {
      res.status(403).json({ message: 'Not authorized.' });
      return;
    }

    if (dispute.filedById === req.userId) {
      res.status(400).json({ message: 'You already filed the primary claim.' });
      return;
    }

    if (dispute.opposingReason) {
      res.status(400).json({ message: 'Counter-evidence already submitted.' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const imageUrls = files ? files.map(f => f.path) : [];

    const updated = await prisma.disputeClaim.update({
      where: { id: disputeId },
      data: {
        opposingReason,
        opposingEvidenceImages: imageUrls,
        status: 'under_review' // move it to under review automatically
      }
    });

    // Trigger notification to original filer and Admin
    await sendAdminNotification(
      'Dispute Counter-Evidence Submitted',
      `Counter-evidence was submitted by user ${req.userId} on dispute ${disputeId}.\n\nReason: ${opposingReason}`
    );
    
    res.status(200).json({ message: 'Counter-evidence submitted successfully', dispute: updated });
  } catch (err) {
    console.error('[POST /api/disputes/:id/counter]', err);
    res.status(500).json({ message: 'Failed to submit counter evidence.' });
  }
});

export default router;
