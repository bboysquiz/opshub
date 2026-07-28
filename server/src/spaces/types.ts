import type { Role } from '../auth/types';

export type SpaceRow = {
  id: string;
  name: string;
  description: string;
  created_by: string | null;
  created_by_email: string | null;
  updated_at: Date | string;
  created_at: Date | string;
};

export type ProjectRow = {
  id: string;
  space_id: string;
  name: string;
  description: string;
  archived_at: Date | string | null;
  created_by: string | null;
  created_by_email: string | null;
  updated_at: Date | string;
  created_at: Date | string;
  ticket_count: number;
  open_ticket_count: number;
  in_progress_ticket_count: number;
};

export type SpaceMemberRow = {
  space_id: string;
  user_id: string;
  email: string;
  role: Role;
  created_at: Date | string;
};

export type ProjectMemberRow = {
  project_id: string;
  space_id: string;
  user_id: string;
  email: string;
  role: Role;
  created_at: Date | string;
};

export type MemberDto = {
  id: string;
  email: string;
  role: Role;
  joinedAt: Date | string;
};

export type ProjectDto = {
  id: string;
  spaceId: string;
  name: string;
  description: string;
  archivedAt: Date | string | null;
  createdBy: string | null;
  createdByEmail: string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
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
  updatedAt: Date | string;
  createdAt: Date | string;
  members: MemberDto[];
  projects: ProjectDto[];
};

export type CreateSpaceInput = {
  name: string;
  description: string;
};

export type UpdateSpaceInput = {
  name?: string;
  description?: string;
};

export type CreateProjectInput = {
  name: string;
  description: string;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string;
  archivedAt?: string | null;
};
