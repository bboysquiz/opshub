import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from './tokens';

export function unauthorized(res: Response): Response {
  return res.status(401).json({ message: 'Unauthorized' });
}

export function requireAccess(req: Request, res: Response, next: NextFunction): void | Response {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return unauthorized(res);

  const token = auth.slice('Bearer '.length);
  const payload = verifyAccessToken(token);
  if (!payload) return unauthorized(res);

  req.user = payload;
  next();
}
