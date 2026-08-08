import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { protect, AuthRequest } from '../middleware/auth';
import { io } from '../index';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();

// Middleware to verify user is part of the booking
const verifyBookingParticipant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { bookingId } = req.params;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    if (booking.renterId !== req.userId && booking.ownerId !== req.userId) {
      res.status(403).json({ message: 'Not authorized to access this chat.' });
      return;
    }

    // Pass booking along to avoid re-querying
    (req as any).booking = booking;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/messages/:bookingId — fetch chat history ────────────────────────

router.get('/:bookingId', protect, verifyBookingParticipant, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { bookingId } = req.params;

  try {
    const messages = await prisma.message.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' }, // Oldest to newest
      include: {
        sender: { select: { id: true, name: true, profileImage: true } }
      }
    });

    res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/messages/:bookingId — send a message ───────────────────────────

const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Message content cannot be empty.')
  })
});

router.post('/:bookingId', protect, verifyBookingParticipant, validate(sendMessageSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { bookingId } = req.params;
  const { content } = req.body;

  try {
    const message = await prisma.message.create({
      data: {
        bookingId,
        senderId: req.userId!,
        content
      },
      include: {
        sender: { select: { id: true, name: true, profileImage: true } }
      }
    });

    // Broadcast the new message to everyone in the room
    io.to(`booking:${bookingId}`).emit('receive_message', message);

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

export default router;
