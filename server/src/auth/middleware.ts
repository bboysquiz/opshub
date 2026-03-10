import type { NextFunction, Request, Response } from 'express';
import type { Role } from './types';
import { verifyAccessToken } from './tokens';

export function unauthorized(res: Response): Response {
  return res.status(401).json({ message: 'Unauthorized' });
}

export function forbidden(res: Response): Response {
  return res.status(403).json({ message: 'Forbidden' });
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

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return unauthorized(res);
    }

    if (!roles.includes(req.user.role)) {
      return forbidden(res);
    }

    next();
  };
}
