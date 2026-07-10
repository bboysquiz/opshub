import { flushPromises, shallowMount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import type {
  AssignableUserDto,
  CreateProjectPayload,
  CreateSpacePayload,
  MemberDto,
  ProjectDto,
  SpaceDto,
} from '~/utils/spacesApi';
import SpacesSettingsPage from './spaces-settings.vue';

const api = vi.hoisted(() => ({
  addProjectMember: vi.fn(),
  addSpaceMember: vi.fn(),
  createProject: vi.fn(),
  createSpace: vi.fn(),
  deleteProject: vi.fn(),
  deleteSpace: vi.fn(),
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

const timestamp = '2026-01-01T00:00:00.000Z';

type UserSelectOption = {
  label: string;
  value: string;
  caption: string;
};

type SpacesPageVm = {
  initializing: boolean;
  selectedSpaceId: string;
  selectedProjectId: string;
  selectedSpaceUserId: string | null;
  selectedProjectUserId: string | null;
  pageError: string | null;
  projectCandidateOptions: UserSelectOption[];
  spaceForm: {
    name: string;
    description: string;
  };
  projectForm: {
    name: string;
    description: string;
  };
  editSpaceForm: {
    name: string;
    description: string;
  };
  editProjectForm: {
    name: string;
    description: string;
  };
  addProjectMember: () => Promise<void>;
  addSpaceMember: () => Promise<void>;
  confirmDeleteProject: () => Promise<void>;
  confirmDeleteSpace: () => Promise<void>;
  createProject: () => Promise<void>;
  createSpace: () => Promise<void>;
  openProjectEditor: () => void;
  openSpaceEditor: () => void;
  requestProjectDeletion: () => void;
  requestSpaceDeletion: () => void;
  saveProjectEdits: () => Promise<void>;
  saveSpaceEdits: () => Promise<void>;
};

const allUsers: AssignableUserDto[] = [
  {
    id: 'agent-1',
    email: 'agent@example.com',
    role: 'agent',
  },
  {
    id: 'outsider-1',
    email: 'outsider@example.com',
    role: 'employee',
  },
];

let spacesDb: SpaceDto[] = [];
let nextSpaceIndex = 1;
let nextProjectIndex = 1;

function cloneMember(member: MemberDto): MemberDto {
  return { ...member };
}

function cloneProject(project: ProjectDto): ProjectDto {
  return {
    ...project,
    members: project.members.map(cloneMember),
  };
}

function cloneSpace(space: SpaceDto): SpaceDto {
  return {
    ...space,
    members: space.members.map(cloneMember),
    projects: space.projects.map(cloneProject),
  };
}

function toMember(userId: string): MemberDto {
  const user = allUsers.find((item) => item.id === userId);
  if (!user) {
    throw new Error(`Unknown test user ${userId}`);
  }

  return {
    ...user,
    joinedAt: timestamp,
  };
}

function findSpace(spaceId: string): SpaceDto {
  const space = spacesDb.find((item) => item.id === spaceId);
  if (!space) {
    throw new Error(`Unknown test space ${spaceId}`);
  }

  return space;
}

function findProject(spaceId: string, projectId: string): ProjectDto {
  const project = findSpace(spaceId).projects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error(`Unknown test project ${projectId}`);
  }

  return project;
}

function installSpacesApiBackend() {
  spacesDb = [];
  nextSpaceIndex = 1;
  nextProjectIndex = 1;

  for (const mock of Object.values(api)) {
    mock.mockReset();
  }

  api.listSpaces.mockImplementation(async () => spacesDb.map(cloneSpace));
  api.listUserOptions.mockImplementation(async () => allUsers.map((user) => ({ ...user })));
  api.listUserOptionsBySpace.mockImplementation(async (spaceId: string) =>
    findSpace(spaceId).members.map(({ id, email, role }) => ({ id, email, role })),
  );
  api.createSpace.mockImplementation(async (payload: CreateSpacePayload) => {
    const space: SpaceDto = {
      id: `space-${nextSpaceIndex}`,
      name: payload.name,
      description: payload.description ?? '',
      createdBy: 'admin-1',
      createdByEmail: 'admin@example.com',
      updatedAt: timestamp,
      createdAt: timestamp,
      members: [],
      projects: [],
    };

    nextSpaceIndex += 1;
    spacesDb.push(space);
    return cloneSpace(space);
  });
  api.updateSpace.mockImplementation(
    async (spaceId: string, payload: { name?: string; description?: string }) => {
      const space = findSpace(spaceId);
      Object.assign(space, payload);
      return cloneSpace(space);
    },
  );
  api.deleteSpace.mockImplementation(async (spaceId: string) => {
    spacesDb = spacesDb.filter((space) => space.id !== spaceId);
  });
  api.createProject.mockImplementation(async (spaceId: string, payload: CreateProjectPayload) => {
    const space = findSpace(spaceId);
    const project: ProjectDto = {
      id: `project-${nextProjectIndex}`,
      spaceId,
      name: payload.name,
      description: payload.description ?? '',
      archivedAt: null,
      createdBy: 'admin-1',
      createdByEmail: 'admin@example.com',
      updatedAt: timestamp,
      createdAt: timestamp,
      members: [],
    };

    nextProjectIndex += 1;
    space.projects.push(project);
    return cloneProject(project);
  });
  api.updateProject.mockImplementation(
    async (
      spaceId: string,
      projectId: string,
      payload: { name?: string; description?: string },
    ) => {
      const project = findProject(spaceId, projectId);
      Object.assign(project, payload);
      return cloneProject(project);
    },
  );
  api.deleteProject.mockImplementation(async (spaceId: string, projectId: string) => {
    const space = findSpace(spaceId);
    space.projects = space.projects.filter((project) => project.id !== projectId);
  });
  api.addSpaceMember.mockImplementation(async (spaceId: string, userId: string) => {
    const space = findSpace(spaceId);
    const member = toMember(userId);

    if (!space.members.some((item) => item.id === member.id)) {
      space.members.push(member);
    }

    return cloneMember(member);
  });
  api.addProjectMember.mockImplementation(
    async (spaceId: string, projectId: string, userId: string) => {
      const space = findSpace(spaceId);
      const project = findProject(spaceId, projectId);
      const member = space.members.find((item) => item.id === userId);

      if (!member) {
        throw new Error('User must be a space member before joining project');
      }

      if (!project.members.some((item) => item.id === userId)) {
        project.members.push(member);
      }

      return cloneMember(member);
    },
  );
}

function mountSpacesPage() {
  return shallowMount(SpacesSettingsPage, {
    global: {
      plugins: [createPinia()],
    },
  });
}

describe('SpacesSettingsPage', () => {
  beforeEach(() => {
    installSpacesApiBackend();
  });

  it('covers creating a space, project, space member and project member', async () => {
    const wrapper = mountSpacesPage();
    await flushPromises();

    const vm = wrapper.vm as unknown as SpacesPageVm;
    expect(vm.initializing).toBe(false);
    expect(api.listSpaces).toHaveBeenCalledTimes(1);
    expect(api.listUserOptions).toHaveBeenCalledTimes(1);

    vm.spaceForm.name = 'Ops';
    vm.spaceForm.description = 'Operations';
    await vm.createSpace();
    await flushPromises();

    expect(api.createSpace).toHaveBeenCalledWith({
      name: 'Ops',
      description: 'Operations',
    });
    expect(vm.selectedSpaceId).toBe('space-1');

    vm.projectForm.name = 'Support';
    vm.projectForm.description = 'L1 support';
    await vm.createProject();
    await flushPromises();

    expect(api.createProject).toHaveBeenCalledWith('space-1', {
      name: 'Support',
      description: 'L1 support',
    });
    expect(vm.selectedProjectId).toBe('project-1');

    vm.selectedSpaceUserId = 'agent-1';
    await vm.addSpaceMember();
    await flushPromises();

    expect(api.addSpaceMember).toHaveBeenCalledWith('space-1', 'agent-1');
    expect(vm.projectCandidateOptions.map((option) => option.value)).toEqual(['agent-1']);
    expect(vm.projectCandidateOptions.map((option) => option.value)).not.toContain('outsider-1');

    vm.selectedProjectUserId = 'outsider-1';
    await vm.addProjectMember();
    await flushPromises();

    expect(api.addProjectMember).not.toHaveBeenCalled();
    expect(vm.pageError).toBeTruthy();

    vm.selectedProjectUserId = 'agent-1';
    await vm.addProjectMember();
    await flushPromises();

    expect(api.addProjectMember).toHaveBeenCalledWith('space-1', 'project-1', 'agent-1');
    expect(spacesDb[0]?.projects[0]?.members).toEqual([
      expect.objectContaining({
        id: 'agent-1',
        email: 'agent@example.com',
      }),
    ]);
  });

  it('edits and deletes the selected project and space', async () => {
    const wrapper = mountSpacesPage();
    await flushPromises();

    const vm = wrapper.vm as unknown as SpacesPageVm;
    vm.spaceForm.name = 'Ops';
    await vm.createSpace();
    vm.projectForm.name = 'Support';
    await vm.createProject();

    vm.openSpaceEditor();
    vm.editSpaceForm.name = 'Operations';
    vm.editSpaceForm.description = 'Updated space';
    await vm.saveSpaceEdits();

    expect(api.updateSpace).toHaveBeenCalledWith('space-1', {
      name: 'Operations',
      description: 'Updated space',
    });

    vm.openProjectEditor();
    vm.editProjectForm.name = 'L1 Support';
    vm.editProjectForm.description = 'Updated project';
    await vm.saveProjectEdits();

    expect(api.updateProject).toHaveBeenCalledWith('space-1', 'project-1', {
      name: 'L1 Support',
      description: 'Updated project',
    });

    vm.requestProjectDeletion();
    await vm.confirmDeleteProject();
    expect(api.deleteProject).toHaveBeenCalledWith('space-1', 'project-1');
    expect(vm.selectedProjectId).toBe('');

    vm.requestSpaceDeletion();
    await vm.confirmDeleteSpace();
    expect(api.deleteSpace).toHaveBeenCalledWith('space-1');
    expect(vm.selectedSpaceId).toBe('');
  });
});
