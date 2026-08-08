import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

/** Hash a plain-text password for storage. */
export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, SALT_ROUNDS);

/** Compare a plain-text password against a stored hash. */
export const comparePassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

/** Generate a cryptographically-secure random hex token (for email links). */
export const generateSecureToken = (): string =>
  crypto.randomBytes(32).toString('hex');

/** SHA-256 hash a token before storing in the database. */
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
