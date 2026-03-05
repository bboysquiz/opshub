import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const IS_PROD = process.env.NODE_ENV === 'production';

export function issueCsrfToken(res: Response): string {
  const token = randomBytes(32).toString('hex');

  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: IS_PROD,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return token;
}

export function requireCsrf(req: Request, res: Response, next: NextFunction): void | Response {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ message: 'CSRF token missing' });
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length || !timingSafeEqual(cookieBuffer, headerBuffer)) {
    return res.status(403).json({ message: 'CSRF token invalid' });
  }

  next();
}
