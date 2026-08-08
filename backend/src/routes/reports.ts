import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { protect, AuthRequest } from '../middleware/auth';
import { ReportTargetType, ReportStatus } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { sendAdminNotification } from '../lib/email';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();

// Max 5 reports per user/IP per 24 hours
const reportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many reports submitted. Please try again tomorrow.' },
  keyGenerator: (req: AuthRequest) => req.userId || req.ip || 'unknown'
});

const createReportSchema = z.object({
  body: z.object({
    targetId: z.string().uuid('Valid target ID required.'),
    reason: z.string().min(1, 'Reason is required.'),
    targetType: z.enum(['user', 'listing', 'review'], { message: 'Invalid target type' }).optional()
  })
});

router.post('/', protect, reportLimiter, validate(createReportSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { targetId, reason, targetType = 'user' } = req.body;
  const reporterId = req.userId!;

  try {
    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType: targetType as ReportTargetType,
        targetId,
        reason,
        status: ReportStatus.pending
      }
    });

    // Check for auto-flagging
    const reportCount = await prisma.report.count({
      where: { targetId, targetType: targetType as ReportTargetType }
    });

    let isAutoFlagged = false;
    if (reportCount >= 3) {
      if (targetType === 'user') {
        await prisma.user.update({ where: { id: targetId }, data: { isFlagged: true } });
        isAutoFlagged = true;
      } else if (targetType === 'listing') {
        await prisma.listing.update({ where: { id: targetId }, data: { isFlagged: true } });
        isAutoFlagged = true;
      }
    }

    // Send admin notification
    await sendAdminNotification(
      `New Report Submitted (${targetType})`,
      `A new report was submitted.\n\nTarget ID: ${targetId}\nType: ${targetType}\nReason: ${reason}\n\nAuto-flagged: ${isAutoFlagged ? 'YES' : 'NO'} (Total reports: ${reportCount})`
    );

    res.status(201).json({ message: 'Report submitted successfully.', report, isAutoFlagged });
  } catch (err) {
    next(err);
  }
});

export default router;
