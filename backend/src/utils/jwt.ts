import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY_JWT } from '../constants';

const getAccessSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
  if (!secret) throw new Error('JWT secret environment variable is not set');
  return secret;
};

export interface TokenPayload {
  sub: string; // userId
  iat?: number;
  exp?: number;
}

export const generateAccessToken = (userId: string): string =>
  jwt.sign({ sub: userId }, getAccessSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });

export const generateRefreshToken = (userId: string): string =>
  jwt.sign({ sub: userId }, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY_JWT });

export const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, getAccessSecret()) as TokenPayload;

export const verifyRefreshToken = (token: string): TokenPayload =>
  jwt.verify(token, getRefreshSecret()) as TokenPayload;
