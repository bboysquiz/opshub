import { createSpacesApi, type ApiRequest, type ProjectDto, type SpaceDto } from './spacesApi';

type ApiCall = {
  path: string;
  init?: RequestInit;
  options?: Parameters<ApiRequest>[2];
};

function createRequestStub(responses: unknown[]) {
  const calls: ApiCall[] = [];
  const request: ApiRequest = async <T>(
    path: string,
    init?: RequestInit,
    options?: Parameters<ApiRequest>[2],
  ): Promise<T> => {
    calls.push({ path, init, options });
    return responses.shift() as T;
  };

  return {
    api: createSpacesApi(request),
    calls,
  };
}

const member = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'member@example.com',
  role: 'employee' as const,
  joinedAt: '2026-01-01T00:00:00.000Z',
};

const project: ProjectDto = {
  id: '22222222-2222-4222-8222-222222222222',
  spaceId: '11111111-1111-4111-8111-111111111111',
  name: 'Support',
  description: '',
  archivedAt: null,
  createdBy: '44444444-4444-4444-8444-444444444444',
  createdByEmail: 'agent@example.com',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [member],
};

const space: SpaceDto = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ops',
  description: '',
  createdBy: '44444444-4444-4444-8444-444444444444',
  createdByEmail: 'agent@example.com',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [member],
  projects: [project],
};

describe('spaces api client', () => {
  it('unwraps list responses without changing the backend contract shape', async () => {
    const { api, calls } = createRequestStub([{ items: [space] }, { items: [project] }]);

    await expect(api.listSpaces()).resolves.toEqual([space]);
    await expect(api.listSpaceProjects(space.id)).resolves.toEqual([project]);

    expect(calls).toEqual([
      { path: '/spaces', init: undefined, options: undefined },
      { path: `/spaces/${space.id}/projects`, init: undefined, options: undefined },
    ]);
  });

  it('marks spaces and project mutations as csrf-protected requests', async () => {
    const { api, calls } = createRequestStub([
      space,
      space,
      undefined,
      project,
      project,
      undefined,
      member,
      member,
      undefined,
      undefined,
    ]);

    await api.createSpace({ name: 'Ops' });
    await api.updateSpace(space.id, { name: 'Updated Ops' });
    await api.deleteSpace(space.id);
    await api.createProject(space.id, { name: 'Support', description: 'L1' });
    await api.updateProject(space.id, project.id, { name: 'Updated Support' });
    await api.deleteProject(space.id, project.id);
    await api.addSpaceMember(space.id, member.id);
    await api.addProjectMember(space.id, project.id, member.id);
    await api.removeSpaceMember(space.id, member.id);
    await api.removeProjectMember(space.id, project.id, member.id);

    expect(calls).toEqual([
      {
        path: '/spaces',
        init: { method: 'POST', body: JSON.stringify({ name: 'Ops' }) },
        options: { csrf: true },
      },
      {
        path: `/spaces/${space.id}`,
        init: { method: 'PATCH', body: JSON.stringify({ name: 'Updated Ops' }) },
        options: { csrf: true },
      },
      {
        path: `/spaces/${space.id}`,
        init: { method: 'DELETE' },
        options: { csrf: true },
      },
      {
        path: `/spaces/${space.id}/projects`,
        init: { method: 'POST', body: JSON.stringify({ name: 'Support', description: 'L1' }) },
        options: { csrf: true },
      },
      {
        path: `/spaces/${space.id}/projects/${project.id}`,
        init: { method: 'PATCH', body: JSON.stringify({ name: 'Updated Support' }) },
        options: { csrf: true },
      },
      {
        path: `/spaces/${space.id}/projects/${project.id}`,
        init: { method: 'DELETE' },
        options: { csrf: true },
      },
      {
        path: `/spaces/${space.id}/members`,
        init: { method: 'POST', body: JSON.stringify({ userId: member.id }) },
        options: { csrf: true },
      },
      {
        path: `/spaces/${space.id}/projects/${project.id}/members`,
        init: { method: 'POST', body: JSON.stringify({ userId: member.id }) },
        options: { csrf: true },
      },
      {
        path: `/spaces/${space.id}/members/${member.id}`,
        init: { method: 'DELETE' },
        options: { csrf: true },
      },
      {
        path: `/spaces/${space.id}/projects/${project.id}/members/${member.id}`,
        init: { method: 'DELETE' },
        options: { csrf: true },
      },
    ]);
  });

  it('unwraps membership list responses for spaces and projects', async () => {
    const { api, calls } = createRequestStub([{ items: [member] }, { items: [member] }]);

    await expect(api.listSpaceMembers(space.id)).resolves.toEqual([member]);
    await expect(api.listProjectMembers(space.id, project.id)).resolves.toEqual([member]);

    expect(calls).toEqual([
      { path: `/spaces/${space.id}/members`, init: undefined, options: undefined },
      {
        path: `/spaces/${space.id}/projects/${project.id}/members`,
        init: undefined,
        options: undefined,
      },
    ]);
  });

  it('uses space-scoped users options endpoint', async () => {
    const { api, calls } = createRequestStub([
      { items: [{ id: member.id, email: member.email, role: member.role }] },
    ]);

    await expect(api.listUserOptionsBySpace('space with space')).resolves.toEqual([
      { id: member.id, email: member.email, role: member.role },
    ]);

    expect(calls).toEqual([
      {
        path: '/users/options?spaceId=space+with+space',
        init: undefined,
        options: undefined,
      },
    ]);
  });

  it('uses unscoped users options endpoint for space member candidates', async () => {
    const { api, calls } = createRequestStub([
      { items: [{ id: member.id, email: member.email, role: member.role }] },
    ]);

    await expect(api.listUserOptions()).resolves.toEqual([
      { id: member.id, email: member.email, role: member.role },
    ]);

    expect(calls).toEqual([
      {
        path: '/users/options',
        init: undefined,
        options: undefined,
      },
    ]);
  });
});
