import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'node:crypto';
import type { CookieOptions } from 'express';
import type { AccessPayload, RefreshTokenParts, SafeUser } from './types';

const ACCESS_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 600);
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 14);
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === 'production';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const JWT_ACCESS_SECRET = requireEnv('JWT_ACCESS_SECRET');

export function signAccessToken(user: Pick<SafeUser, 'id' | 'email' | 'role'>): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    if (typeof decoded === 'string') return null;

    const { sub, email, role } = decoded;
    if (typeof sub !== 'string' || typeof email !== 'string' || typeof role !== 'string') {
      return null;
    }

    if (role !== 'admin' && role !== 'agent' && role !== 'employee') return null;

    return { sub, email, role };
  } catch {
    return null;
  }
}

export function makeRefreshToken(): RefreshTokenParts {
  return {
    sessionId: randomUUID(),
    secret: randomBytes(48).toString('base64url'),
  };
}

export function encodeRefreshToken(parts: RefreshTokenParts): string {
  return `${parts.sessionId}.${parts.secret}`;
}

export function parseRefreshToken(raw?: string): RefreshTokenParts | null {
  if (!raw) return null;

  const firstDot = raw.indexOf('.');
  if (firstDot <= 0 || raw.indexOf('.', firstDot + 1) !== -1) return null;

  const sessionId = raw.slice(0, firstDot);
  const secret = raw.slice(firstDot + 1);
  if (!sessionId || !secret) return null;

  return { sessionId, secret };
}

function refreshCookieBaseOptions(): CookieOptions {
  const domain = process.env.COOKIE_DOMAIN?.trim() || undefined;
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    path: '/auth',
    domain,
  };
}

export function refreshCookieOptions(): CookieOptions {
  return { ...refreshCookieBaseOptions(), maxAge: REFRESH_TTL_MS };
}

export function refreshClearCookieOptions(): CookieOptions {
  return refreshCookieBaseOptions();
}

export function refreshExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TTL_MS);
}
