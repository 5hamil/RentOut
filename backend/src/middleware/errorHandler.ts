import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = ((err as any).errors || (err as any).issues).map((e: any) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(422).json({
      message: 'Validation failed.',
      errors: formattedErrors
    });
  }

  // 2. Custom Application Errors (if any with status)
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // 3. Prevent stack trace leakage in production
  const response: any = { message };
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  // Log error internally but hide from user if 500
  if (statusCode === 500) {
    console.error('[Unhandled Error]', err);
    if (process.env.NODE_ENV === 'production') {
      response.message = 'Internal Server Error'; // Obscure DB/Code logic errors
    }
  }

  res.status(statusCode).json(response);
};
