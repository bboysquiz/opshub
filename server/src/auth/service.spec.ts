import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  hash: vi.fn(),
  countUsersByRole: vi.fn(),
  createUser: vi.fn(),
  createRefreshSession: vi.fn(),
  makeRefreshToken: vi.fn(),
  encodeRefreshToken: vi.fn(),
  refreshExpiresAt: vi.fn(),
  signAccessToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: mocks.hash,
    compare: vi.fn(),
  },
}));

vi.mock('../db', () => ({
  pool: {
    connect: vi.fn(),
  },
}));

vi.mock('./repository', () => ({
  countUsersByRole: mocks.countUsersByRole,
  createUser: mocks.createUser,
  createRefreshSession: mocks.createRefreshSession,
  findRefreshSessionForUpdate: vi.fn(),
  findUserByEmailWithPassword: vi.fn(),
  findUserById: vi.fn(),
  findUserMeById: vi.fn(),
  listUsersForAdmin: vi.fn(),
  revokeRefreshSessionById: vi.fn(),
  updateUserAccess: vi.fn(),
}));

vi.mock('./tokens', () => ({
  encodeRefreshToken: mocks.encodeRefreshToken,
  makeRefreshToken: mocks.makeRefreshToken,
  parseRefreshToken: vi.fn(),
  refreshExpiresAt: mocks.refreshExpiresAt,
  signAccessToken: mocks.signAccessToken,
}));

import { register } from './service';

describe('auth registration bootstrap role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hash.mockResolvedValue('hash');
    mocks.makeRefreshToken.mockReturnValue({ sessionId: 'session-1', secret: 'secret' });
    mocks.encodeRefreshToken.mockReturnValue('refresh-token');
    mocks.refreshExpiresAt.mockReturnValue(new Date('2027-01-01T00:00:00.000Z'));
    mocks.signAccessToken.mockReturnValue('access-token');
    mocks.createRefreshSession.mockResolvedValue(undefined);
    mocks.createUser.mockImplementation(
      async ({ email, role }: { email: string; role: 'admin' | 'agent' | 'employee' }) => ({
        id: 'user-1',
        email,
        role,
        featureFlags: { newTicketsTable: false },
      }),
    );
  });

  it('creates an admin when the database has no admins', async () => {
    mocks.countUsersByRole.mockResolvedValue(0);

    await register(
      { email: 'Owner@Example.com', password: 'password' },
      { userAgent: null, ip: null },
    );

    expect(mocks.countUsersByRole).toHaveBeenCalledWith('admin');
    expect(mocks.createUser).toHaveBeenCalledWith({
      email: 'owner@example.com',
      passwordHash: 'hash',
      role: 'admin',
    });
  });

  it('creates an employee when an admin already exists', async () => {
    mocks.countUsersByRole.mockResolvedValue(1);

    await register(
      { email: 'employee@example.com', password: 'password' },
      { userAgent: null, ip: null },
    );

    expect(mocks.createUser).toHaveBeenCalledWith({
      email: 'employee@example.com',
      passwordHash: 'hash',
      role: 'employee',
    });
  });
});
