import { createPinia, setActivePinia } from 'pinia';
import { spaceAccessErrorStateCopy } from '~/utils/spacesAccess';
import type { AssignableUserDto, MemberDto, ProjectDto, SpaceDto } from '~/utils/spacesApi';

const api = vi.hoisted(() => ({
  addProjectMember: vi.fn(),
  addSpaceMember: vi.fn(),
  createProject: vi.fn(),
  createSpace: vi.fn(),
  listProjectMembers: vi.fn(),
  listSpaceMembers: vi.fn(),
  listSpaceProjects: vi.fn(),
  listSpaces: vi.fn(),
  listUserOptions: vi.fn(),
  listUserOptionsBySpace: vi.fn(),
  removeProjectMember: vi.fn(),
  removeSpaceMember: vi.fn(),
  updateProject: vi.fn(),
  updateSpace: vi.fn(),
}));

vi.mock('~/composables/useSpacesApi', () => ({
  useSpacesApi: () => api,
}));

import { useSpacesStore } from './spaces';

const timestamp = '2026-01-01T00:00:00.000Z';

function makeMember(overrides: Partial<MemberDto> = {}): MemberDto {
  return {
    id: 'user-1',
    email: 'agent@example.com',
    role: 'agent',
    joinedAt: timestamp,
    ...overrides,
  };
}

function makeProject(overrides: Partial<ProjectDto> = {}): ProjectDto {
  return {
    id: 'project-1',
    spaceId: 'space-1',
    name: 'Support',
    description: '',
    archivedAt: null,
    createdBy: 'admin-1',
    createdByEmail: 'admin@example.com',
    updatedAt: timestamp,
    createdAt: timestamp,
    members: [],
    ...overrides,
  };
}

function makeSpace(overrides: Partial<SpaceDto> = {}): SpaceDto {
  return {
    id: 'space-1',
    name: 'Ops',
    description: '',
    createdBy: 'admin-1',
    createdByEmail: 'admin@example.com',
    updatedAt: timestamp,
    createdAt: timestamp,
    members: [],
    projects: [],
    ...overrides,
  };
}

describe('spaces store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    for (const mock of Object.values(api)) {
      mock.mockReset();
    }
  });

  it('keeps spaces, projects and members in one local state graph', async () => {
    const member = makeMember();
    const createdSpace = makeSpace();
    const createdProject = makeProject();

    api.createSpace.mockResolvedValue(createdSpace);
    api.createProject.mockResolvedValue(createdProject);
    api.addSpaceMember.mockResolvedValue(member);
    api.addProjectMember.mockResolvedValue(member);

    const store = useSpacesStore();

    await expect(store.createSpace({ name: 'Ops' })).resolves.toEqual(createdSpace);
    await expect(store.createProject('space-1', { name: 'Support' })).resolves.toEqual(
      createdProject,
    );

    store.userOptionsBySpace = {
      'space-1': [],
    };

    await expect(store.addSpaceMember('space-1', 'user-1')).resolves.toEqual(member);
    await expect(store.addProjectMember('space-1', 'project-1', 'user-1')).resolves.toEqual(member);

    expect(api.createSpace).toHaveBeenCalledWith({ name: 'Ops' });
    expect(api.createProject).toHaveBeenCalledWith('space-1', { name: 'Support' });
    expect(api.addSpaceMember).toHaveBeenCalledWith('space-1', 'user-1');
    expect(api.addProjectMember).toHaveBeenCalledWith('space-1', 'project-1', 'user-1');
    expect(store.spaces).toEqual([
      expect.objectContaining({
        id: 'space-1',
        members: [member],
        projects: [
          expect.objectContaining({
            id: 'project-1',
            members: [member],
          }),
        ],
      }),
    ]);
    expect(store.projectsBySpace['space-1']).toEqual([
      expect.objectContaining({ id: 'project-1', members: [member] }),
    ]);
    expect(store.projectMembersByProject['project-1']).toEqual([member]);
    expect(store.userOptionsBySpace['space-1']).toEqual([member]);
    expect(store.error).toBeNull();
  });

  it('normalizes stale project membership errors without clearing existing state', async () => {
    const member = makeMember();
    const project = makeProject({ members: [] });
    const space = makeSpace({ members: [member], projects: [project] });

    api.listSpaces.mockResolvedValue([space]);
    api.addProjectMember.mockRejectedValue(
      new Error('User must be a space member before joining project'),
    );

    const store = useSpacesStore();
    await store.loadSpaces();

    await expect(store.addProjectMember('space-1', 'project-1', 'user-1')).rejects.toThrow(
      spaceAccessErrorStateCopy.projectMemberOutsideSpace.message,
    );

    expect(store.error).toBe(spaceAccessErrorStateCopy.projectMemberOutsideSpace.message);
    expect(store.spaces).toEqual([space]);
    expect(store.projectMembersByProject['project-1']).toEqual([]);
    expect(store.saving).toBe(false);
  });

  it('loads scoped and unscoped user option lists through the API layer', async () => {
    const user: AssignableUserDto = {
      id: 'user-1',
      email: 'agent@example.com',
      role: 'agent',
    };

    api.listUserOptions.mockResolvedValue([user]);
    api.listUserOptionsBySpace.mockResolvedValue([user]);

    const store = useSpacesStore();

    await expect(store.loadUserOptions()).resolves.toEqual([user]);
    await expect(store.loadUserOptionsBySpace('space-1')).resolves.toEqual([user]);

    expect(api.listUserOptions).toHaveBeenCalledTimes(1);
    expect(api.listUserOptionsBySpace).toHaveBeenCalledWith('space-1');
    expect(store.userOptions).toEqual([user]);
    expect(store.userOptionsBySpace['space-1']).toEqual([user]);
    expect(store.optionsLoading).toBe(false);
  });
});
