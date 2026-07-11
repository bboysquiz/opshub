import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { useSpacesApi } from '~/composables/useSpacesApi';
import { spaceAccessErrorStateCopy } from '~/utils/spacesAccess';
import type {
  AssignableUserDto,
  CreateProjectPayload,
  CreateSpacePayload,
  MemberDto,
  ProjectDto,
  SpaceDto,
  UpdateProjectPayload,
  UpdateSpacePayload,
} from '~/utils/spacesApi';

type SpacesRequestScope = 'read' | 'write' | 'options';

function normalizeSpacesErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message === 'Forbidden') {
    return spaceAccessErrorStateCopy.forbidden.message;
  }

  if (error.message === 'Project with this name already exists in space') {
    return spaceAccessErrorStateCopy.duplicateProjectName.message;
  }

  if (error.message === 'User must be a space member before joining project') {
    return spaceAccessErrorStateCopy.projectMemberOutsideSpace.message;
  }

  if (error.message === 'Space contains tickets and cannot be deleted') {
    return spaceAccessErrorStateCopy.deleteSpaceBlocked.message;
  }

  if (error.message === 'Project contains tickets and cannot be deleted') {
    return spaceAccessErrorStateCopy.deleteProjectBlocked.message;
  }

  if (error.message === 'Failed to fetch') {
    return spaceAccessErrorStateCopy.network.message;
  }

  if (error.message === 'Invalid body' || error.message === 'Invalid params') {
    return 'Invalid spaces request data';
  }

  if (error.message === 'Invalid query') {
    return 'Invalid user options request data';
  }

  if (error.message === 'Internal server error') {
    return 'Internal server error';
  }

  return error.message || fallback;
}

function upsertMember(items: MemberDto[], member: MemberDto): MemberDto[] {
  if (!items.some((item) => item.id === member.id)) {
    return [...items, member];
  }

  return items.map((item) => (item.id === member.id ? member : item));
}

function upsertAssignableUser(
  items: AssignableUserDto[],
  user: AssignableUserDto,
): AssignableUserDto[] {
  if (!items.some((item) => item.id === user.id)) {
    return [...items, user];
  }

  return items.map((item) => (item.id === user.id ? user : item));
}

export const useSpacesStore = defineStore('spaces', () => {
  const api = useSpacesApi();

  const spaces = ref<SpaceDto[]>([]);
  const spaceMembersBySpace = ref<Record<string, MemberDto[]>>({});
  const projectsBySpace = ref<Record<string, ProjectDto[]>>({});
  const projectMembersByProject = ref<Record<string, MemberDto[]>>({});
  const userOptions = ref<AssignableUserDto[]>([]);
  const userOptionsBySpace = ref<Record<string, AssignableUserDto[]>>({});
  const pending = reactive<Record<SpacesRequestScope, number>>({
    read: 0,
    write: 0,
    options: 0,
  });
  const error = ref<string | null>(null);

  const loading = computed(() => pending.read > 0);
  const saving = computed(() => pending.write > 0);
  const optionsLoading = computed(() => pending.options > 0);
  const busy = computed(() => loading.value || saving.value || optionsLoading.value);
  const hasSpaces = computed(() => spaces.value.length > 0);
  let spacesRequest: Promise<SpaceDto[]> | null = null;

  function clearError() {
    error.value = null;
  }

  async function run<T>(
    scope: SpacesRequestScope,
    fallback: string,
    action: () => Promise<T>,
  ): Promise<T> {
    pending[scope] += 1;
    error.value = null;

    try {
      return await action();
    } catch (requestError) {
      const message = normalizeSpacesErrorMessage(requestError, fallback);
      error.value = message;
      throw new Error(message, { cause: requestError });
    } finally {
      pending[scope] = Math.max(0, pending[scope] - 1);
    }
  }

  function setSpaces(nextSpaces: SpaceDto[]) {
    const nextSpaceMembers: Record<string, MemberDto[]> = {};
    const nextProjects: Record<string, ProjectDto[]> = {};
    const nextProjectMembers: Record<string, MemberDto[]> = {};

    for (const space of nextSpaces) {
      nextSpaceMembers[space.id] = space.members;
      nextProjects[space.id] = space.projects;

      for (const project of space.projects) {
        nextProjectMembers[project.id] = project.members;
      }
    }

    spaces.value = nextSpaces;
    spaceMembersBySpace.value = nextSpaceMembers;
    projectsBySpace.value = nextProjects;
    projectMembersByProject.value = nextProjectMembers;
  }

  function updateSpaceInList(spaceId: string, updater: (space: SpaceDto) => SpaceDto) {
    spaces.value = spaces.value.map((space) => (space.id === spaceId ? updater(space) : space));
  }

  function upsertSpace(nextSpace: SpaceDto) {
    const exists = spaces.value.some((space) => space.id === nextSpace.id);
    const nextSpaces = exists
      ? spaces.value.map((space) => (space.id === nextSpace.id ? nextSpace : space))
      : [...spaces.value, nextSpace];

    setSpaces(nextSpaces);
  }

  function setSpaceMembers(spaceId: string, members: MemberDto[]) {
    spaceMembersBySpace.value = {
      ...spaceMembersBySpace.value,
      [spaceId]: members,
    };

    updateSpaceInList(spaceId, (space) => ({
      ...space,
      members,
    }));
  }

  function setProjects(spaceId: string, projects: ProjectDto[]) {
    const nextProjectMembers = { ...projectMembersByProject.value };

    for (const project of projects) {
      nextProjectMembers[project.id] = project.members;
    }

    projectsBySpace.value = {
      ...projectsBySpace.value,
      [spaceId]: projects,
    };
    projectMembersByProject.value = nextProjectMembers;

    updateSpaceInList(spaceId, (space) => ({
      ...space,
      projects,
    }));
  }

  function upsertProject(spaceId: string, nextProject: ProjectDto) {
    const spaceProjects =
      projectsBySpace.value[spaceId] ??
      spaces.value.find((space) => space.id === spaceId)?.projects ??
      [];
    const exists = spaceProjects.some((project) => project.id === nextProject.id);
    const nextProjects = exists
      ? spaceProjects.map((project) => (project.id === nextProject.id ? nextProject : project))
      : [...spaceProjects, nextProject];

    setProjects(spaceId, nextProjects);
  }

  function setProjectMembers(spaceId: string, projectId: string, members: MemberDto[]) {
    projectMembersByProject.value = {
      ...projectMembersByProject.value,
      [projectId]: members,
    };

    const spaceProjects =
      projectsBySpace.value[spaceId] ??
      spaces.value.find((space) => space.id === spaceId)?.projects;

    if (!spaceProjects) {
      return;
    }

    setProjects(
      spaceId,
      spaceProjects.map((project) =>
        project.id === projectId ? { ...project, members } : project,
      ),
    );
  }

  function syncAssignableUser(spaceId: string, user: AssignableUserDto) {
    const current = userOptionsBySpace.value[spaceId];
    if (!current) {
      return;
    }

    userOptionsBySpace.value = {
      ...userOptionsBySpace.value,
      [spaceId]: upsertAssignableUser(current, user),
    };
  }

  function removeAssignableUser(spaceId: string, userId: string) {
    const current = userOptionsBySpace.value[spaceId];
    if (!current) {
      return;
    }

    userOptionsBySpace.value = {
      ...userOptionsBySpace.value,
      [spaceId]: current.filter((user) => user.id !== userId),
    };
  }

  function loadSpaces(): Promise<SpaceDto[]> {
    if (spacesRequest) {
      return spacesRequest;
    }

    spacesRequest = run('read', 'Failed to load spaces', () => api.listSpaces())
      .then((items) => {
        setSpaces(items);
        return items;
      })
      .finally(() => {
        spacesRequest = null;
      });

    return spacesRequest;
  }

  async function createSpace(payload: CreateSpacePayload): Promise<SpaceDto> {
    const space = await run('write', 'Failed to create space', () => api.createSpace(payload));
    upsertSpace(space);
    return space;
  }

  async function updateSpace(spaceId: string, payload: UpdateSpacePayload): Promise<SpaceDto> {
    const space = await run('write', 'Failed to update space', () =>
      api.updateSpace(spaceId, payload),
    );
    upsertSpace(space);
    return space;
  }

  async function deleteSpace(spaceId: string): Promise<void> {
    await run('write', 'Failed to delete space', () => api.deleteSpace(spaceId));
    setSpaces(spaces.value.filter((space) => space.id !== spaceId));

    const nextUserOptionsBySpace = { ...userOptionsBySpace.value };
    delete nextUserOptionsBySpace[spaceId];
    userOptionsBySpace.value = nextUserOptionsBySpace;
  }

  async function loadSpaceMembers(spaceId: string): Promise<MemberDto[]> {
    const members = await run('read', 'Failed to load space members', () =>
      api.listSpaceMembers(spaceId),
    );
    setSpaceMembers(spaceId, members);
    return members;
  }

  async function addSpaceMember(spaceId: string, userId: string): Promise<MemberDto> {
    const member = await run('write', 'Failed to add space member', () =>
      api.addSpaceMember(spaceId, userId),
    );
    setSpaceMembers(spaceId, upsertMember(spaceMembersBySpace.value[spaceId] ?? [], member));
    syncAssignableUser(spaceId, member);
    return member;
  }

  async function removeSpaceMember(spaceId: string, userId: string): Promise<void> {
    await run('write', 'Failed to remove space member', () =>
      api.removeSpaceMember(spaceId, userId),
    );

    setSpaceMembers(
      spaceId,
      (spaceMembersBySpace.value[spaceId] ?? []).filter((member) => member.id !== userId),
    );
    removeAssignableUser(spaceId, userId);

    const nextProjects = (projectsBySpace.value[spaceId] ?? []).map((project) => ({
      ...project,
      members: project.members.filter((member) => member.id !== userId),
    }));
    setProjects(spaceId, nextProjects);
  }

  async function loadSpaceProjects(spaceId: string): Promise<ProjectDto[]> {
    const projects = await run('read', 'Failed to load space projects', () =>
      api.listSpaceProjects(spaceId),
    );
    setProjects(spaceId, projects);
    return projects;
  }

  async function createProject(
    spaceId: string,
    payload: CreateProjectPayload,
  ): Promise<ProjectDto> {
    const project = await run('write', 'Failed to create project', () =>
      api.createProject(spaceId, payload),
    );
    upsertProject(spaceId, project);
    return project;
  }

  async function updateProject(
    spaceId: string,
    projectId: string,
    payload: UpdateProjectPayload,
  ): Promise<ProjectDto> {
    const project = await run('write', 'Failed to update project', () =>
      api.updateProject(spaceId, projectId, payload),
    );
    upsertProject(spaceId, project);
    return project;
  }

  async function deleteProject(spaceId: string, projectId: string): Promise<void> {
    await run('write', 'Failed to delete project', () => api.deleteProject(spaceId, projectId));

    const projects = (projectsBySpace.value[spaceId] ?? []).filter(
      (project) => project.id !== projectId,
    );
    setProjects(spaceId, projects);

    const nextProjectMembers = { ...projectMembersByProject.value };
    delete nextProjectMembers[projectId];
    projectMembersByProject.value = nextProjectMembers;
  }

  async function loadProjectMembers(spaceId: string, projectId: string): Promise<MemberDto[]> {
    const members = await run('read', 'Failed to load project members', () =>
      api.listProjectMembers(spaceId, projectId),
    );
    setProjectMembers(spaceId, projectId, members);
    return members;
  }

  async function addProjectMember(
    spaceId: string,
    projectId: string,
    userId: string,
  ): Promise<MemberDto> {
    const member = await run('write', 'Failed to add project member', () =>
      api.addProjectMember(spaceId, projectId, userId),
    );
    setProjectMembers(
      spaceId,
      projectId,
      upsertMember(projectMembersByProject.value[projectId] ?? [], member),
    );
    return member;
  }

  async function removeProjectMember(
    spaceId: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    await run('write', 'Failed to remove project member', () =>
      api.removeProjectMember(spaceId, projectId, userId),
    );
    setProjectMembers(
      spaceId,
      projectId,
      (projectMembersByProject.value[projectId] ?? []).filter((member) => member.id !== userId),
    );
  }

  async function loadUserOptionsBySpace(spaceId: string): Promise<AssignableUserDto[]> {
    const options = await run('options', 'Failed to load user options', () =>
      api.listUserOptionsBySpace(spaceId),
    );
    userOptionsBySpace.value = {
      ...userOptionsBySpace.value,
      [spaceId]: options,
    };
    return options;
  }

  async function loadUserOptions(): Promise<AssignableUserDto[]> {
    const options = await run('options', 'Failed to load user options', () =>
      api.listUserOptions(),
    );
    userOptions.value = options;
    return options;
  }

  return {
    spaces,
    spaceMembersBySpace,
    projectsBySpace,
    projectMembersByProject,
    userOptions,
    userOptionsBySpace,
    loading,
    saving,
    optionsLoading,
    busy,
    hasSpaces,
    error,
    clearError,
    loadSpaces,
    createSpace,
    updateSpace,
    deleteSpace,
    loadSpaceMembers,
    addSpaceMember,
    removeSpaceMember,
    loadSpaceProjects,
    createProject,
    updateProject,
    deleteProject,
    loadProjectMembers,
    addProjectMember,
    removeProjectMember,
    loadUserOptionsBySpace,
    loadUserOptions,
  };
});
