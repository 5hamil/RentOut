import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Allow safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Check header and cookie
  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies['csrfToken'];

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    console.error(`CSRF Failed. Header: ${csrfHeader}, Cookie: ${csrfCookie}`);
    res.status(403).json({ message: 'CSRF token missing or invalid' });
    return;
  }

  next();
};

export const generateCsrfToken = (req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  res.json({ csrfToken: token });
};
