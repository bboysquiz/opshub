import type { UserRole } from './access';

export type SpacesApiRequestOptions = {
  csrf?: boolean;
};

export type ApiRequest = <T>(
  path: string,
  init?: RequestInit,
  options?: SpacesApiRequestOptions,
) => Promise<T>;

type ItemsResponse<T> = {
  items: T[];
};

export type MemberDto = {
  id: string;
  email: string;
  role: UserRole;
  joinedAt: string;
};

export type ProjectDto = {
  id: string;
  spaceId: string;
  name: string;
  description: string;
  archivedAt: string | null;
  createdBy: string | null;
  createdByEmail: string | null;
  updatedAt: string;
  createdAt: string;
  ticketStats: {
    total: number;
    open: number;
    inProgress: number;
  };
  members: MemberDto[];
};

export type SpaceDto = {
  id: string;
  name: string;
  description: string;
  createdBy: string | null;
  createdByEmail: string | null;
  updatedAt: string;
  createdAt: string;
  members: MemberDto[];
  projects: ProjectDto[];
};

export type CreateSpacePayload = {
  name: string;
  description?: string;
};

export type UpdateSpacePayload = {
  name?: string;
  description?: string;
};

export type CreateProjectPayload = {
  name: string;
  description?: string;
};

export type UpdateProjectPayload = {
  name?: string;
  description?: string;
  archivedAt?: string | null;
};

export type AssignableUserDto = {
  id: string;
  email: string;
  role: UserRole;
};

function encodePathPart(value: string): string {
  return encodeURIComponent(value);
}

function jsonInit(method: string, payload: unknown): RequestInit {
  return {
    method,
    body: JSON.stringify(payload),
  };
}

function memberPayload(userId: string) {
  return { userId };
}

function spacePath(spaceId: string): string {
  return `/spaces/${encodePathPart(spaceId)}`;
}

function spaceMemberPath(spaceId: string, userId?: string): string {
  const base = `${spacePath(spaceId)}/members`;
  return userId ? `${base}/${encodePathPart(userId)}` : base;
}

function projectPath(spaceId: string, projectId?: string): string {
  const base = `${spacePath(spaceId)}/projects`;
  return projectId ? `${base}/${encodePathPart(projectId)}` : base;
}

function projectMemberPath(spaceId: string, projectId: string, userId?: string): string {
  const base = `${projectPath(spaceId, projectId)}/members`;
  return userId ? `${base}/${encodePathPart(userId)}` : base;
}

export function createSpacesApi(request: ApiRequest) {
  return {
    async listSpaces(): Promise<SpaceDto[]> {
      const data = await request<ItemsResponse<SpaceDto>>('/spaces');
      return data.items;
    },

    createSpace(payload: CreateSpacePayload): Promise<SpaceDto> {
      return request<SpaceDto>('/spaces', jsonInit('POST', payload), { csrf: true });
    },

    updateSpace(spaceId: string, payload: UpdateSpacePayload): Promise<SpaceDto> {
      return request<SpaceDto>(spacePath(spaceId), jsonInit('PATCH', payload), { csrf: true });
    },

    deleteSpace(spaceId: string): Promise<void> {
      return request<void>(spacePath(spaceId), { method: 'DELETE' }, { csrf: true });
    },

    async listSpaceMembers(spaceId: string): Promise<MemberDto[]> {
      const data = await request<ItemsResponse<MemberDto>>(spaceMemberPath(spaceId));
      return data.items;
    },

    addSpaceMember(spaceId: string, userId: string): Promise<MemberDto> {
      return request<MemberDto>(spaceMemberPath(spaceId), jsonInit('POST', memberPayload(userId)), {
        csrf: true,
      });
    },

    removeSpaceMember(spaceId: string, userId: string): Promise<void> {
      return request<void>(
        spaceMemberPath(spaceId, userId),
        {
          method: 'DELETE',
        },
        { csrf: true },
      );
    },

    async listSpaceProjects(spaceId: string): Promise<ProjectDto[]> {
      const data = await request<ItemsResponse<ProjectDto>>(projectPath(spaceId));
      return data.items;
    },

    createProject(spaceId: string, payload: CreateProjectPayload): Promise<ProjectDto> {
      return request<ProjectDto>(projectPath(spaceId), jsonInit('POST', payload), { csrf: true });
    },

    updateProject(
      spaceId: string,
      projectId: string,
      payload: UpdateProjectPayload,
    ): Promise<ProjectDto> {
      return request<ProjectDto>(projectPath(spaceId, projectId), jsonInit('PATCH', payload), {
        csrf: true,
      });
    },

    deleteProject(spaceId: string, projectId: string): Promise<void> {
      return request<void>(projectPath(spaceId, projectId), { method: 'DELETE' }, { csrf: true });
    },

    async listProjectMembers(spaceId: string, projectId: string): Promise<MemberDto[]> {
      const data = await request<ItemsResponse<MemberDto>>(projectMemberPath(spaceId, projectId));
      return data.items;
    },

    addProjectMember(spaceId: string, projectId: string, userId: string): Promise<MemberDto> {
      return request<MemberDto>(
        projectMemberPath(spaceId, projectId),
        jsonInit('POST', memberPayload(userId)),
        { csrf: true },
      );
    },

    removeProjectMember(spaceId: string, projectId: string, userId: string): Promise<void> {
      return request<void>(
        projectMemberPath(spaceId, projectId, userId),
        {
          method: 'DELETE',
        },
        { csrf: true },
      );
    },

    async listUserOptionsBySpace(spaceId: string): Promise<AssignableUserDto[]> {
      const query = new URLSearchParams({ spaceId });
      const data = await request<ItemsResponse<AssignableUserDto>>(`/users/options?${query}`);
      return data.items;
    },

    async listUserOptions(): Promise<AssignableUserDto[]> {
      const data = await request<ItemsResponse<AssignableUserDto>>('/users/options');
      return data.items;
    },
  };
}
