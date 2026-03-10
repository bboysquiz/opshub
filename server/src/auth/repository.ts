import type { PoolClient } from 'pg';
import { pool } from '../db';
import { normalizeFeatureFlags } from './feature-flags';
import type {
  FeatureFlags,
  RefreshSessionRow,
  Role,
  SafeUser,
  UserMe,
  UserWithPassword,
} from './types';

type Queryable = Pick<PoolClient, 'query'>;

type UserRow = {
  id: string;
  email: string;
  role: Role;
  feature_flags: unknown;
};

type UserWithPasswordRow = UserRow & {
  password_hash: string;
};

type UserMeRow = {
  id: string;
  email: string;
  role: Role;
  created_at: Date | string;
  feature_flags: unknown;
};

type AssignableUserRow = {
  id: string;
  email: string;
  role: Role;
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
     returning id, email, role, feature_flags`,
    [args.email, args.passwordHash, args.role],
  );

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    featureFlags: normalizeFeatureFlags(row.feature_flags),
  };
}

export async function findUserByEmailWithPassword(
  email: string,
  db: Queryable = pool,
): Promise<UserWithPassword | null> {
  const result = await db.query<UserWithPasswordRow>(
    `select id, email, role, feature_flags, password_hash
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
    featureFlags: normalizeFeatureFlags(row.feature_flags),
    passwordHash: row.password_hash,
  };
}

export async function findUserById(userId: string, db: Queryable = pool): Promise<SafeUser | null> {
  const result = await db.query<UserRow>(
    `select id, email, role, feature_flags
     from users
     where id = $1
     limit 1`,
    [userId],
  );

  if (!result.rowCount) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    featureFlags: normalizeFeatureFlags(row.feature_flags),
  };
}

export async function findUserMeById(userId: string, db: Queryable = pool): Promise<UserMe | null> {
  const result = await db.query<UserMeRow>(
    `select id, email, role, created_at, feature_flags
     from users
     where id = $1
     limit 1`,
    [userId],
  );

  if (!result.rowCount) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    featureFlags: normalizeFeatureFlags(row.feature_flags),
  };
}

export async function countUsers(db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>('select count(*)::text as count from users');
  return Number(result.rows[0]?.count ?? '0');
}

export async function countUsersByRole(role: Role, db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(
    'select count(*)::text as count from users where role = $1',
    [role],
  );

  return Number(result.rows[0]?.count ?? '0');
}

export async function listUsersForAdmin(db: Queryable = pool): Promise<UserMe[]> {
  const result = await db.query<UserMeRow>(
    `select id, email, role, created_at, feature_flags
     from users
     order by created_at asc`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    featureFlags: normalizeFeatureFlags(row.feature_flags),
  }));
}

export async function listUsersForAssignment(
  db: Queryable = pool,
): Promise<Array<{ id: string; email: string; role: Role }>> {
  const result = await db.query<AssignableUserRow>(
    `select id, email, role
     from users
     order by created_at asc`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
  }));
}

export async function updateUserAccess(
  args: {
    userId: string;
    role?: Role;
    featureFlags?: FeatureFlags;
  },
  db: Queryable = pool,
): Promise<UserMe | null> {
  const result = await db.query<UserMeRow>(
    `update users
     set role = coalesce($2, role),
         feature_flags = case
           when $3::jsonb is null then feature_flags
           else coalesce(feature_flags, '{}'::jsonb) || $3::jsonb
         end
     where id = $1
     returning id, email, role, created_at, feature_flags`,
    [args.userId, args.role ?? null, args.featureFlags ? JSON.stringify(args.featureFlags) : null],
  );

  if (!result.rowCount) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    featureFlags: normalizeFeatureFlags(row.feature_flags),
  };
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
