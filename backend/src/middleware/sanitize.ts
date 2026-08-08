import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

export const xssSanitizer = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query) as any;
  if (req.params) req.params = sanitizeObject(req.params) as any;
  next();
};

const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return xss(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: any = {};
    for (const key in obj) {
      sanitizedObj[key] = sanitizeObject(obj[key]);
    }
    return sanitizedObj;
  }
  return obj;
};
