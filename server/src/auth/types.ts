import type { Request } from 'express';

export type Role = 'admin' | 'agent' | 'employee';
export type FeatureFlags = {
  newTicketsTable: boolean;
};

export type SafeUser = {
  id: string;
  email: string;
  role: Role;
  featureFlags: FeatureFlags;
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
  role: Role;
  createdAt: Date | string;
  featureFlags: FeatureFlags;
};

export type SessionMeta = {
  userAgent: string | null;
  ip: string | null;
};

export type AuthedRequest = Request & {
  user: AccessPayload;
};
