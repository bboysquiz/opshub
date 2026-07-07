import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessPayload, SafeUser } from '../auth/types';
import { findUserById } from '../auth/repository';
import { addProjectMember, findProjectById, findSpaceMember } from './repository';
import { addProjectMemberRecord } from './service';
import type { ProjectMemberRow, ProjectRow, SpaceMemberRow } from './types';

vi.mock('../db', () => ({
  pool: {
    connect: vi.fn(),
  },
}));

vi.mock('../auth/repository', () => ({
  findUserById: vi.fn(),
}));

vi.mock('./repository', () => ({
  addProjectMember: vi.fn(),
  addSpaceMember: vi.fn(),
  createProject: vi.fn(),
  createSpace: vi.fn(),
  findProjectById: vi.fn(),
  findSpaceById: vi.fn(),
  findSpaceMember: vi.fn(),
  isProjectMember: vi.fn(),
  isSpaceMember: vi.fn(),
  listProjectMembers: vi.fn(),
  listProjectMembersByProjectIds: vi.fn(),
  listProjectsBySpaceIds: vi.fn(),
  listProjectsForSpace: vi.fn(),
  listSpaceMembers: vi.fn(),
  listSpaceMembersBySpaceIds: vi.fn(),
  listSpacesForActor: vi.fn(),
  removeProjectMember: vi.fn(),
  removeSpaceMember: vi.fn(),
  updateProjectById: vi.fn(),
  updateSpaceById: vi.fn(),
}));

const adminActor: AccessPayload = {
  sub: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.test',
  role: 'admin',
};

const employeeActor: AccessPayload = {
  sub: '55555555-5555-4555-8555-555555555555',
  email: 'employee@example.test',
  role: 'employee',
};

const spaceId = '22222222-2222-4222-8222-222222222222';
const projectId = '33333333-3333-4333-8333-333333333333';
const memberId = '44444444-4444-4444-8444-444444444444';
const createdAt = '2026-07-02T09:00:00.000Z';

const projectRow: ProjectRow = {
  id: projectId,
  space_id: spaceId,
  name: 'Ops project',
  description: 'Project for Ops team',
  archived_at: null,
  created_by: adminActor.sub,
  created_by_email: adminActor.email,
  updated_at: createdAt,
  created_at: createdAt,
};

const memberUser: SafeUser = {
  id: memberId,
  email: 'employee@example.test',
  role: 'employee',
  featureFlags: {
    newTicketsTable: false,
  },
};

const spaceMemberRow: SpaceMemberRow = {
  space_id: spaceId,
  user_id: memberId,
  email: memberUser.email,
  role: memberUser.role,
  created_at: createdAt,
};

const projectMemberRow: ProjectMemberRow = {
  project_id: projectId,
  space_id: spaceId,
  user_id: memberId,
  email: memberUser.email,
  role: memberUser.role,
  created_at: createdAt,
};

const mockedFindProjectById = vi.mocked(findProjectById);
const mockedFindUserById = vi.mocked(findUserById);
const mockedFindSpaceMember = vi.mocked(findSpaceMember);
const mockedAddProjectMember = vi.mocked(addProjectMember);

describe('spaces service contracts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('adds a project member when the user belongs to the parent space', async () => {
    mockedFindProjectById.mockResolvedValue(projectRow);
    mockedFindUserById.mockResolvedValue(memberUser);
    mockedFindSpaceMember.mockResolvedValue(spaceMemberRow);
    mockedAddProjectMember.mockResolvedValue(projectMemberRow);

    const member = await addProjectMemberRecord(spaceId, projectId, memberId, adminActor);

    expect(member).toEqual({
      id: memberId,
      email: memberUser.email,
      role: memberUser.role,
      joinedAt: createdAt,
    });
    expect(mockedAddProjectMember).toHaveBeenCalledWith(spaceId, projectId, memberId);
  });

  it('rejects adding a project member outside the parent space', async () => {
    mockedFindProjectById.mockResolvedValue(projectRow);
    mockedFindUserById.mockResolvedValue(memberUser);
    mockedFindSpaceMember.mockResolvedValue(null);

    await expect(
      addProjectMemberRecord(spaceId, projectId, memberId, adminActor),
    ).rejects.toMatchObject({
      status: 400,
      message: 'User must be a space member before joining project',
    });
    expect(mockedAddProjectMember).not.toHaveBeenCalled();
  });

  it('returns 404 when project is missing before member checks', async () => {
    mockedFindProjectById.mockResolvedValue(null);

    await expect(
      addProjectMemberRecord(spaceId, projectId, memberId, adminActor),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Project not found',
    });
    expect(mockedFindUserById).not.toHaveBeenCalled();
  });

  it('returns 403 when an employee tries to manage project members', async () => {
    mockedFindProjectById.mockResolvedValue(projectRow);

    await expect(
      addProjectMemberRecord(spaceId, projectId, memberId, employeeActor),
    ).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    });
    expect(mockedFindUserById).not.toHaveBeenCalled();
  });
});
