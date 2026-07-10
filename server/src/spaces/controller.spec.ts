import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessPayload } from '../auth/types';
import { SpacesError } from './errors';
import type { MemberDto, ProjectDto, SpaceDto } from './types';

vi.mock('./service', () => ({
  addProjectMemberRecord: vi.fn(),
  addSpaceMemberRecord: vi.fn(),
  createProjectRecord: vi.fn(),
  createSpaceRecord: vi.fn(),
  deleteProjectRecord: vi.fn(),
  deleteSpaceRecord: vi.fn(),
  listProjectMembersRecord: vi.fn(),
  listSpaceMembersRecord: vi.fn(),
  listSpaceProjectsRecord: vi.fn(),
  listSpacesTree: vi.fn(),
  removeProjectMemberRecord: vi.fn(),
  removeSpaceMemberRecord: vi.fn(),
  updateProjectRecord: vi.fn(),
  updateSpaceRecord: vi.fn(),
}));

import {
  addProjectMemberHandler,
  addSpaceMemberHandler,
  createProjectHandler,
  createSpaceHandler,
  deleteProjectHandler,
  deleteSpaceHandler,
  listSpacesHandler,
  patchProjectHandler,
  patchSpaceHandler,
  removeSpaceMemberHandler,
} from './controller';
import * as spacesService from './service';

type TestResponse = Response & {
  statusCode: number;
  body: unknown;
  sent: boolean;
};

const adminActor: AccessPayload = {
  sub: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.test',
  role: 'admin',
};

const spaceId = '22222222-2222-4222-8222-222222222222';
const projectId = '33333333-3333-4333-8333-333333333333';
const memberId = '44444444-4444-4444-8444-444444444444';
const createdAt = '2026-07-02T09:00:00.000Z';

const memberDto: MemberDto = {
  id: memberId,
  email: 'employee@example.test',
  role: 'employee',
  joinedAt: createdAt,
};

const projectDto: ProjectDto = {
  id: projectId,
  spaceId,
  name: 'Ops project',
  description: 'Project for Ops team',
  archivedAt: null,
  createdBy: adminActor.sub,
  createdByEmail: adminActor.email,
  updatedAt: createdAt,
  createdAt,
  members: [memberDto],
};

const spaceDto: SpaceDto = {
  id: spaceId,
  name: 'Ops space',
  description: 'Space for Ops team',
  createdBy: adminActor.sub,
  createdByEmail: adminActor.email,
  updatedAt: createdAt,
  createdAt,
  members: [memberDto],
  projects: [projectDto],
};

function createRequest(args: {
  user?: AccessPayload;
  params?: Record<string, string>;
  body?: unknown;
}): Request {
  return {
    user: args.user,
    params: args.params ?? {},
    body: args.body,
  } as Request;
}

function createResponse(): TestResponse {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    sent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    send() {
      this.sent = true;
      return this;
    },
  };

  return response as TestResponse;
}

const mockedSpacesService = vi.mocked(spacesService);

describe('spaces controller contracts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns GET /spaces response as items tree', async () => {
    mockedSpacesService.listSpacesTree.mockResolvedValue([spaceDto]);
    const res = createResponse();

    await listSpacesHandler(createRequest({ user: adminActor }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ items: [spaceDto] });
    expect(mockedSpacesService.listSpacesTree).toHaveBeenCalledWith(adminActor);
  });

  it('returns 401 for GET /spaces without actor', async () => {
    const res = createResponse();

    await listSpacesHandler(createRequest({}), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Unauthorized' });
    expect(mockedSpacesService.listSpacesTree).not.toHaveBeenCalled();
  });

  it('creates a space and returns 201 DTO', async () => {
    mockedSpacesService.createSpaceRecord.mockResolvedValue({ ...spaceDto, projects: [] });
    const res = createResponse();

    await createSpaceHandler(
      createRequest({
        user: adminActor,
        body: { name: '  Ops space  ', description: '  ' },
      }),
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ ...spaceDto, projects: [] });
    expect(mockedSpacesService.createSpaceRecord).toHaveBeenCalledWith(
      { name: 'Ops space', description: '' },
      adminActor,
    );
  });

  it('returns 400 when create space body is invalid', async () => {
    const res = createResponse();

    await createSpaceHandler(
      createRequest({ user: adminActor, body: { description: 'No name' } }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid body' });
    expect(mockedSpacesService.createSpaceRecord).not.toHaveBeenCalled();
  });

  it('updates a space and returns its refreshed DTO', async () => {
    const updated = { ...spaceDto, name: 'Updated space', description: 'Updated' };
    mockedSpacesService.updateSpaceRecord.mockResolvedValue(updated);
    const res = createResponse();

    await patchSpaceHandler(
      createRequest({
        user: adminActor,
        params: { spaceId },
        body: { name: '  Updated space  ', description: 'Updated' },
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(updated);
    expect(mockedSpacesService.updateSpaceRecord).toHaveBeenCalledWith(
      spaceId,
      { name: 'Updated space', description: 'Updated' },
      adminActor,
    );
  });

  it('deletes a space and returns 204 without body', async () => {
    mockedSpacesService.deleteSpaceRecord.mockResolvedValue(undefined);
    const res = createResponse();

    await deleteSpaceHandler(createRequest({ user: adminActor, params: { spaceId } }), res);

    expect(res.statusCode).toBe(204);
    expect(res.sent).toBe(true);
    expect(mockedSpacesService.deleteSpaceRecord).toHaveBeenCalledWith(spaceId, adminActor);
  });

  it('creates a project inside a space and returns 201 DTO', async () => {
    mockedSpacesService.createProjectRecord.mockResolvedValue(projectDto);
    const res = createResponse();

    await createProjectHandler(
      createRequest({
        user: adminActor,
        params: { spaceId },
        body: { name: 'Ops project', description: 'Project for Ops team' },
      }),
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(projectDto);
    expect(mockedSpacesService.createProjectRecord).toHaveBeenCalledWith(
      spaceId,
      { name: 'Ops project', description: 'Project for Ops team' },
      adminActor,
    );
  });

  it('returns 404 when parent space for project does not exist', async () => {
    mockedSpacesService.createProjectRecord.mockRejectedValue(
      new SpacesError(404, 'Space not found'),
    );
    const res = createResponse();

    await createProjectHandler(
      createRequest({
        user: adminActor,
        params: { spaceId },
        body: { name: 'Missing parent' },
      }),
      res,
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'Space not found' });
  });

  it('updates a project inside its parent space', async () => {
    const updated = { ...projectDto, name: 'Updated project' };
    mockedSpacesService.updateProjectRecord.mockResolvedValue(updated);
    const res = createResponse();

    await patchProjectHandler(
      createRequest({
        user: adminActor,
        params: { spaceId, projectId },
        body: { name: 'Updated project' },
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(updated);
    expect(mockedSpacesService.updateProjectRecord).toHaveBeenCalledWith(
      spaceId,
      projectId,
      { name: 'Updated project' },
      adminActor,
    );
  });

  it('returns 409 when deleting a project that still contains tickets', async () => {
    mockedSpacesService.deleteProjectRecord.mockRejectedValue(
      new SpacesError(409, 'Project contains tickets and cannot be deleted'),
    );
    const res = createResponse();

    await deleteProjectHandler(
      createRequest({ user: adminActor, params: { spaceId, projectId } }),
      res,
    );

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ message: 'Project contains tickets and cannot be deleted' });
  });

  it('adds a space member and returns 201 member DTO', async () => {
    mockedSpacesService.addSpaceMemberRecord.mockResolvedValue(memberDto);
    const res = createResponse();

    await addSpaceMemberHandler(
      createRequest({
        user: adminActor,
        params: { spaceId },
        body: { userId: memberId },
      }),
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(memberDto);
    expect(mockedSpacesService.addSpaceMemberRecord).toHaveBeenCalledWith(
      spaceId,
      memberId,
      adminActor,
    );
  });

  it('removes a space member and returns 204 without body', async () => {
    mockedSpacesService.removeSpaceMemberRecord.mockResolvedValue(undefined);
    const res = createResponse();

    await removeSpaceMemberHandler(
      createRequest({
        user: adminActor,
        params: { spaceId, userId: memberId },
      }),
      res,
    );

    expect(res.statusCode).toBe(204);
    expect(res.sent).toBe(true);
    expect(mockedSpacesService.removeSpaceMemberRecord).toHaveBeenCalledWith(
      spaceId,
      memberId,
      adminActor,
    );
  });

  it('returns 404 when space member removal target is missing', async () => {
    mockedSpacesService.removeSpaceMemberRecord.mockRejectedValue(
      new SpacesError(404, 'Space member not found'),
    );
    const res = createResponse();

    await removeSpaceMemberHandler(
      createRequest({
        user: adminActor,
        params: { spaceId, userId: memberId },
      }),
      res,
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'Space member not found' });
  });

  it('adds a project member and returns 201 member DTO', async () => {
    mockedSpacesService.addProjectMemberRecord.mockResolvedValue(memberDto);
    const res = createResponse();

    await addProjectMemberHandler(
      createRequest({
        user: adminActor,
        params: { spaceId, projectId },
        body: { userId: memberId },
      }),
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(memberDto);
    expect(mockedSpacesService.addProjectMemberRecord).toHaveBeenCalledWith(
      spaceId,
      projectId,
      memberId,
      adminActor,
    );
  });

  it('returns 400 when project member is not a space member', async () => {
    mockedSpacesService.addProjectMemberRecord.mockRejectedValue(
      new SpacesError(400, 'User must be a space member before joining project'),
    );
    const res = createResponse();

    await addProjectMemberHandler(
      createRequest({
        user: adminActor,
        params: { spaceId, projectId },
        body: { userId: memberId },
      }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'User must be a space member before joining project' });
  });

  it('returns 403 when service rejects project member management', async () => {
    mockedSpacesService.addProjectMemberRecord.mockRejectedValue(new SpacesError(403, 'Forbidden'));
    const res = createResponse();

    await addProjectMemberHandler(
      createRequest({
        user: adminActor,
        params: { spaceId, projectId },
        body: { userId: memberId },
      }),
      res,
    );

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ message: 'Forbidden' });
  });
});
