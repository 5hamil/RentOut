import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import {
  hashPassword,
  comparePassword,
  generateSecureToken,
  hashToken,
} from '../utils/hash';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { protect, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../lib/rateLimiters';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth';
import {
  CURRENT_TOS_VERSION,
  COOKIE_NAME_REFRESH,
  REFRESH_TOKEN_EXPIRY_MS,
  PASSWORD_RESET_EXPIRY_MS,
} from '../constants';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Return only the fields safe to expose in API responses. */
const safeUser = (user: {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImage: string | null;
  avgRating: number | null;
  verificationStatus: string;
  tosAcceptedAt: Date | null;
  tosVersion: string | null;
  resubmissionCount: number;
  isAdmin: boolean;
  createdAt: Date;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  profileImage: user.profileImage,
  avgRating: user.avgRating,
  verificationStatus: user.verificationStatus,
  resubmissionCount: user.resubmissionCount,
  isAdmin: user.isAdmin,
  tosAcceptedAt: user.tosAcceptedAt,
  tosVersion: user.tosVersion,
  createdAt: user.createdAt,
});

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  profileImage: true,
  avgRating: true,
  verificationStatus: true,
  resubmissionCount: true,
  isAdmin: true,
  tosAcceptedAt: true,
  tosVersion: true,
  createdAt: true,
  // Omitted: passwordHash, idDocumentUrl, refreshTokens, etc.
} as const;

/** Set the refresh token as an HttpOnly cookie. */
const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(COOKIE_NAME_REFRESH, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: '/api/auth', // scoped — cookie only sent to /api/auth/* routes
  });
};

/** Clear the refresh token cookie. */
const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAME_REFRESH, { path: '/api/auth' });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────

router.post('/signup', authLimiter, validate(signupSchema), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, email, phone, password, tosAccepted, tosVersion } = req.body;

  // Guard — double-check ToS (belt + suspenders beyond validator)
  if (!tosAccepted || tosAccepted === 'false') {
    res.status(400).json({
      message: 'You must accept the Terms of Service, Privacy Policy, and Damage Policy.',
      errors: [{ field: 'tosAccepted', message: 'ToS acceptance is required.' }],
    });
    return;
  }

  try {
    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
      select: { email: true, phone: true },
    });

    if (existing) {
      const field = existing.email === email ? 'email' : 'phone';
      res.status(409).json({
        message: `An account with this ${field} already exists.`,
        errors: [{ field, message: `This ${field} is already registered.` }],
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        verificationStatus: 'unverified',
        tosAcceptedAt: new Date(),
        tosVersion: tosVersion || CURRENT_TOS_VERSION,
      },
      select: USER_SELECT,
    });

    // Issue tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      message: 'Account created successfully.',
      user: safeUser(user),
      accessToken,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...USER_SELECT, passwordHash: true },
    });

    // Use a constant-time response to prevent user enumeration
    const passwordMatch = user ? await comparePassword(password, user.passwordHash) : false;

    if (!user || !passwordMatch) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    if (user.verificationStatus === 'permanently_blocked') {
      res.status(403).json({
        message: 'This account has been permanently suspended. Please contact support.',
        code: 'ACCOUNT_BLOCKED',
      });
      return;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    setRefreshCookie(res, refreshToken);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeData } = user;
    res.status(200).json({
      message: 'Login successful.',
      user: safeUser(safeData),
      accessToken,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Rotates the refresh token (old one is invalidated, new one is issued).
// ─────────────────────────────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.[COOKIE_NAME_REFRESH];

  if (!token) {
    res.status(401).json({ message: 'No refresh token provided.' });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    const tokenHash = hashToken(token);

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.userId !== payload.sub || stored.expiresAt < new Date()) {
      clearRefreshCookie(res);
      res.status(401).json({ message: 'Refresh token is invalid or expired. Please log in again.' });
      return;
    }

    // Rotate: delete old token, issue new pair
    await prisma.refreshToken.delete({ where: { tokenHash } });

    const newAccessToken = generateAccessToken(payload.sub);
    const newRefreshToken = generateRefreshToken(payload.sub);

    await prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    setRefreshCookie(res, newRefreshToken);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    clearRefreshCookie(res);
    res.status(401).json({ message: 'Refresh token is invalid or expired. Please log in again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.[COOKIE_NAME_REFRESH];

  if (token) {
    try {
      await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(token) } });
    } catch {
      // If token not found in DB, that's fine — still clear the cookie
    }
  }

  clearRefreshCookie(res);
  res.status(200).json({ message: 'Logged out successfully.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/me', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: USER_SELECT,
    });

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json({ user: safeUser(user) });
  } catch (err) {
    console.error('[GET /auth/me]', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Generic response — never reveal whether the email exists
    const GENERIC_MSG = 'If an account with that email exists, a password reset link has been sent.';

    const { email } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

      if (user) {
        // Invalidate any existing unused reset tokens for this user
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, used: false } });

        const rawToken = generateSecureToken();
        const tokenHash = hashToken(rawToken);

        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
          },
        });

        // TODO: In production, send this via email (e.g. SendGrid, Resend, Nodemailer).
        // The reset URL should be: ${FRONTEND_URL}/reset-password?token=${rawToken}
        if (process.env.NODE_ENV !== 'production') {
          console.log(`\n🔑 [DEV] Password reset token for ${email}:\n${rawToken}\n`);
        }
      }

      res.status(200).json({ message: GENERIC_MSG });
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { token, newPassword: password } = req.body;

    try {
      const tokenHash = hashToken(token);

      const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

      if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
        res.status(400).json({
          message: 'This password reset link is invalid or has expired. Please request a new one.',
        });
        return;
      }

      const newPasswordHash = await hashPassword(password);

      // Update password, mark token as used, and invalidate all refresh tokens
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash: newPasswordHash },
        }),
        prisma.passwordResetToken.update({
          where: { tokenHash },
          data: { used: true },
        }),
        // Force all devices to re-authenticate
        prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
      ]);

      res.status(200).json({ message: 'Password reset successfully. Please log in with your new password.' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
