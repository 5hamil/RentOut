import rateLimit from 'express-rate-limit';
import { AuthRequest } from '../middleware/auth';

// Strict rate limit for auth (Login, Register) - 10 requests per 15 mins
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many authentication attempts, please try again after 15 minutes.' },
  keyGenerator: (req) => req.ip || 'unknown'
});

// Moderate limit for booking requests - 10 requests per hour
export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Too many booking requests. Please try again later.' },
  keyGenerator: (req: AuthRequest) => req.userId || req.ip || 'unknown'
});
