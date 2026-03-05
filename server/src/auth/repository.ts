import type { PoolClient } from 'pg';
import { pool } from '../db';
import type { RefreshSessionRow, Role, SafeUser, UserMe, UserWithPassword } from './types';

type Queryable = Pick<PoolClient, 'query'>;

type UserRow = {
  id: string;
  email: string;
  role: Role;
};

type UserWithPasswordRow = UserRow & {
  password_hash: string;
};

type UserMeRow = {
  id: string;
  email: string;
  role: string;
  created_at: Date | string;
};

type RefreshSessionDbRow = {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
};

export async function createUser(
  args: { email: string; passwordHash: string; role: Role },
  db: Queryable = pool,
): Promise<SafeUser> {
  const result = await db.query<UserRow>(
    `insert into users (email, password_hash, role)
     values ($1, $2, $3)
     returning id, email, role`,
    [args.email, args.passwordHash, args.role],
  );

  return result.rows[0];
}

export async function findUserByEmailWithPassword(
  email: string,
  db: Queryable = pool,
): Promise<UserWithPassword | null> {
  const result = await db.query<UserWithPasswordRow>(
    `select id, email, role, password_hash
     from users
     where email = $1
     limit 1`,
    [email],
  );

  if (!result.rowCount) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
  };
}

export async function findUserById(userId: string, db: Queryable = pool): Promise<SafeUser | null> {
  const result = await db.query<UserRow>(
    `select id, email, role
     from users
     where id = $1
     limit 1`,
    [userId],
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function findUserMeById(userId: string, db: Queryable = pool): Promise<UserMe | null> {
  const result = await db.query<UserMeRow>(
    `select id, email, role, created_at
     from users
     where id = $1
     limit 1`,
    [userId],
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function createRefreshSession(
  args: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ip: string | null;
    expiresAt: Date;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `insert into refresh_sessions (id, user_id, refresh_token_hash, user_agent, ip, expires_at)
     values ($1, $2, $3, $4, $5, $6)`,
    [args.id, args.userId, args.refreshTokenHash, args.userAgent, args.ip, args.expiresAt],
  );
}

export async function findRefreshSessionForUpdate(
  sessionId: string,
  db: Queryable,
): Promise<RefreshSessionRow | null> {
  const result = await db.query<RefreshSessionDbRow>(
    `select id, user_id, refresh_token_hash, expires_at, revoked_at
     from refresh_sessions
     where id = $1
     for update`,
    [sessionId],
  );

  if (!result.rowCount) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

export async function revokeRefreshSessionById(
  sessionId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `update refresh_sessions
     set revoked_at = now()
     where id = $1 and revoked_at is null`,
    [sessionId],
  );
}
