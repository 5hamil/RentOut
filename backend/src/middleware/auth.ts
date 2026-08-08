import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Protect — verifies the Bearer access token on every protected route.
 * Attaches `req.userId` for downstream handlers.
 */
export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required. Please log in.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: 'Access token expired or invalid. Please refresh your session.' });
  }
};

/**
 * requireVerified — must be chained AFTER `protect`.
 * Rejects the request if the user has not completed ID verification.
 * This gates actions like creating a listing or requesting a booking.
 */
export const requireVerified = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { verificationStatus: true },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  if (user.verificationStatus !== 'verified') {
    res.status(403).json({
      message: 'ID verification is required to perform this action.',
      code: 'VERIFICATION_REQUIRED',
      verificationStatus: user.verificationStatus,
    });
    return;
  }

  next();
};

/**
 * requireAdmin — must be chained AFTER `protect`.
 * Rejects the request if the user is not an admin.
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { isAdmin: true },
  });

  if (!user || !user.isAdmin) {
    res.status(403).json({ message: 'Admin access required.' });
    return;
  }

  next();
};
