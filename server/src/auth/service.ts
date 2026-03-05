import bcrypt from 'bcrypt';
import { pool } from '../db';
import { AuthError, isAuthError, isPgUniqueViolation } from './errors';
import {
  createRefreshSession,
  createUser,
  findRefreshSessionForUpdate,
  findUserByEmailWithPassword,
  findUserById,
  findUserMeById,
  revokeRefreshSessionById,
} from './repository';
import {
  encodeRefreshToken,
  makeRefreshToken,
  parseRefreshToken,
  refreshExpiresAt,
  signAccessToken,
} from './tokens';
import type { Role, SafeUser, SessionMeta, UserMe } from './types';

const BCRYPT_ROUNDS = 12;

type RegisterInput = {
  email: string;
  password: string;
  role?: Role;
};

type LoginInput = {
  email: string;
  password: string;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

type RegisterResponse = AuthResponse & {
  user: SafeUser;
};

function isExpired(expiresAt: Date | string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function register(input: RegisterInput, meta: SessionMeta): Promise<RegisterResponse> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const email = input.email.toLowerCase();
  const role = input.role ?? 'agent';

  let user: SafeUser;
  try {
    user = await createUser({ email, passwordHash, role });
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      throw new AuthError(409, 'Email already exists');
    }
    throw err;
  }

  const refresh = makeRefreshToken();
  const refreshTokenHash = await bcrypt.hash(refresh.secret, BCRYPT_ROUNDS);

  await createRefreshSession({
    id: refresh.sessionId,
    userId: user.id,
    refreshTokenHash,
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt: refreshExpiresAt(),
  });

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: encodeRefreshToken(refresh),
  };
}

export async function login(input: LoginInput, meta: SessionMeta): Promise<AuthResponse> {
  const email = input.email.toLowerCase();
  const user = await findUserByEmailWithPassword(email);
  if (!user) throw new AuthError(401, 'Unauthorized');

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) throw new AuthError(401, 'Unauthorized');

  const refresh = makeRefreshToken();
  const refreshTokenHash = await bcrypt.hash(refresh.secret, BCRYPT_ROUNDS);

  await createRefreshSession({
    id: refresh.sessionId,
    userId: user.id,
    refreshTokenHash,
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt: refreshExpiresAt(),
  });

  return {
    accessToken: signAccessToken({ id: user.id, email: user.email, role: user.role }),
    refreshToken: encodeRefreshToken(refresh),
  };
}

export async function refresh(rawRefreshToken?: string, meta?: SessionMeta): Promise<AuthResponse> {
  const parsedToken = parseRefreshToken(rawRefreshToken);
  if (!parsedToken) throw new AuthError(401, 'Unauthorized');

  const client = await pool.connect();
  try {
    await client.query('begin');

    const session = await findRefreshSessionForUpdate(parsedToken.sessionId, client);
    if (!session) throw new AuthError(401, 'Unauthorized');
    if (session.revokedAt !== null || isExpired(session.expiresAt)) {
      throw new AuthError(401, 'Unauthorized');
    }

    const isTokenValid = await bcrypt.compare(parsedToken.secret, session.refreshTokenHash);
    if (!isTokenValid) throw new AuthError(401, 'Unauthorized');

    const user = await findUserById(session.userId, client);
    if (!user) throw new AuthError(401, 'Unauthorized');

    await revokeRefreshSessionById(session.id, client);

    const next = makeRefreshToken();
    const nextHash = await bcrypt.hash(next.secret, BCRYPT_ROUNDS);

    await createRefreshSession(
      {
        id: next.sessionId,
        userId: session.userId,
        refreshTokenHash: nextHash,
        userAgent: meta?.userAgent ?? null,
        ip: meta?.ip ?? null,
        expiresAt: refreshExpiresAt(),
      },
      client,
    );

    await client.query('commit');

    return {
      accessToken: signAccessToken(user),
      refreshToken: encodeRefreshToken(next),
    };
  } catch (err) {
    try {
      await client.query('rollback');
    } catch {
      // no-op
    }

    if (isAuthError(err)) throw err;
    console.error(err);
    throw new AuthError(500, 'Internal server error');
  } finally {
    client.release();
  }
}

export async function logout(rawRefreshToken?: string): Promise<void> {
  const parsedToken = parseRefreshToken(rawRefreshToken);
  if (!parsedToken) return;

  await revokeRefreshSessionById(parsedToken.sessionId);
}

export async function me(userId: string): Promise<UserMe> {
  const user = await findUserMeById(userId);
  if (!user) throw new AuthError(404, 'User not found');
  return user;
}
