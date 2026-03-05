import type { Request } from 'express';

export type Role = 'admin' | 'agent' | 'employee';

export type SafeUser = {
  id: string;
  email: string;
  role: Role;
};

export type UserWithPassword = SafeUser & {
  passwordHash: string;
};

export type AccessPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type RefreshTokenParts = {
  sessionId: string;
  secret: string;
};

export type RefreshSessionRow = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date | string;
  revokedAt: Date | string | null;
};

export type UserMe = {
  id: string;
  email: string;
  role: string;
  created_at: Date | string;
};

export type SessionMeta = {
  userAgent: string | null;
  ip: string | null;
};

export type AuthedRequest = Request & {
  user: AccessPayload;
};
