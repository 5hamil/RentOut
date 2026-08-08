import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { protect, AuthRequest } from '../middleware/auth';
import { uploadID } from '../lib/cloudinary';
import { VerificationStatus } from '@prisma/client';

const router = Router();

router.post('/upload', protect, uploadID.single('document'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No document uploaded.' });
      return;
    }

    const idDocumentUrl = req.file.path;

    // Fetch user to check current status
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Don't allow upload if permanently blocked
    if (user.verificationStatus === VerificationStatus.permanently_blocked) {
      res.status(403).json({ message: 'Your account is permanently blocked from verification.' });
      return;
    }

    // Don't allow upload if already verified
    if (user.verificationStatus === VerificationStatus.verified) {
      res.status(400).json({ message: 'Your account is already verified.' });
      return;
    }

    // Update user: status -> pending, and store the private URL
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        verificationStatus: VerificationStatus.pending,
        idDocumentUrl
      }
    });

    res.status(200).json({ message: 'Document uploaded successfully. Status is now pending.' });
  } catch (err) {
    console.error('[POST /api/verifications/upload]', err);
    res.status(500).json({ message: 'Failed to upload document.' });
  }
});

export default router;
