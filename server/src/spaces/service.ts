import { findUserById } from '../auth/repository';
import type { AccessPayload } from '../auth/types';
import { pool } from '../db';
import { SpacesError } from './errors';
import {
  addProjectMember,
  addSpaceMember,
  createProject,
  createSpace,
  deleteProjectById,
  deleteSpaceById,
  findProjectById,
  findSpaceById,
  findSpaceMember,
  isProjectMember,
  isSpaceMember,
  listProjectMembers,
  listProjectMembersByProjectIds,
  listProjectsBySpaceIds,
  listProjectsForSpace,
  listSpaceMembers,
  listSpaceMembersBySpaceIds,
  listSpacesForActor,
  removeProjectMember,
  removeSpaceMember,
  updateProjectById,
  updateSpaceById,
} from './repository';
import type {
  CreateProjectInput,
  CreateSpaceInput,
  MemberDto,
  ProjectDto,
  ProjectMemberRow,
  ProjectRow,
  SpaceDto,
  SpaceMemberRow,
  SpaceRow,
  UpdateProjectInput,
  UpdateSpaceInput,
} from './types';

function mapMember(row: SpaceMemberRow | ProjectMemberRow): MemberDto {
  return {
    id: row.user_id,
    email: row.email,
    role: row.role,
    joinedAt: row.created_at,
  };
}

function mapProject(row: ProjectRow, members: MemberDto[] = []): ProjectDto {
  return {
    id: row.id,
    spaceId: row.space_id,
    name: row.name,
    description: row.description,
    archivedAt: row.archived_at,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    members,
  };
}

function mapSpace(row: SpaceRow, members: MemberDto[] = [], projects: ProjectDto[] = []): SpaceDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    members,
    projects,
  };
}

function groupSpaceMembers(rows: SpaceMemberRow[]): Map<string, MemberDto[]> {
  const groups = new Map<string, MemberDto[]>();

  for (const row of rows) {
    const current = groups.get(row.space_id) ?? [];
    current.push(mapMember(row));
    groups.set(row.space_id, current);
  }

  return groups;
}

function groupProjectMembers(rows: ProjectMemberRow[]): Map<string, MemberDto[]> {
  const groups = new Map<string, MemberDto[]>();

  for (const row of rows) {
    const current = groups.get(row.project_id) ?? [];
    current.push(mapMember(row));
    groups.set(row.project_id, current);
  }

  return groups;
}

function groupProjects(
  rows: ProjectRow[],
  members: Map<string, MemberDto[]>,
): Map<string, ProjectDto[]> {
  const groups = new Map<string, ProjectDto[]>();

  for (const row of rows) {
    const current = groups.get(row.space_id) ?? [];
    current.push(mapProject(row, members.get(row.id) ?? []));
    groups.set(row.space_id, current);
  }

  return groups;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23503';
}

function assertCanCreateOrManage(actor: AccessPayload): void {
  if (actor.role === 'admin' || actor.role === 'agent') {
    return;
  }

  throw new SpacesError(403, 'Forbidden');
}

async function getSpaceOrThrow(spaceId: string): Promise<SpaceRow> {
  const space = await findSpaceById(spaceId);
  if (!space) {
    throw new SpacesError(404, 'Space not found');
  }

  return space;
}

async function getProjectOrThrow(spaceId: string, projectId: string): Promise<ProjectRow> {
  const project = await findProjectById(spaceId, projectId);
  if (!project) {
    throw new SpacesError(404, 'Project not found');
  }

  return project;
}

async function assertCanReadSpace(actor: AccessPayload, spaceId: string): Promise<void> {
  if (actor.role === 'admin') {
    return;
  }

  if (await isSpaceMember(spaceId, actor.sub)) {
    return;
  }

  throw new SpacesError(403, 'Forbidden');
}

async function assertCanManageSpace(actor: AccessPayload, spaceId: string): Promise<void> {
  assertCanCreateOrManage(actor);

  if (actor.role === 'admin') {
    return;
  }

  if (await isSpaceMember(spaceId, actor.sub)) {
    return;
  }

  throw new SpacesError(403, 'Forbidden');
}

async function assertCanReadProject(
  actor: AccessPayload,
  spaceId: string,
  projectId: string,
): Promise<void> {
  if (actor.role === 'admin') {
    return;
  }

  if (actor.role === 'agent' && (await isSpaceMember(spaceId, actor.sub))) {
    return;
  }

  if (await isProjectMember(projectId, actor.sub)) {
    return;
  }

  throw new SpacesError(403, 'Forbidden');
}

async function buildSpaceTree(spaceRows: SpaceRow[], actor: AccessPayload): Promise<SpaceDto[]> {
  const spaceIds = spaceRows.map((space) => space.id);
  const [spaceMemberRows, projectRows] = await Promise.all([
    listSpaceMembersBySpaceIds(spaceIds),
    listProjectsBySpaceIds({
      spaceIds,
      actorId: actor.sub,
      includeAll: actor.role !== 'employee',
    }),
  ]);

  const projectIds = projectRows.map((project) => project.id);
  const projectMemberRows = await listProjectMembersByProjectIds(projectIds);
  const spaceMembers = groupSpaceMembers(spaceMemberRows);
  const projectMembers = groupProjectMembers(projectMemberRows);
  const projects = groupProjects(projectRows, projectMembers);

  return spaceRows.map((space) =>
    mapSpace(space, spaceMembers.get(space.id) ?? [], projects.get(space.id) ?? []),
  );
}

export async function listSpacesTree(actor: AccessPayload): Promise<SpaceDto[]> {
  const spaces = await listSpacesForActor({
    actorId: actor.sub,
    includeAll: actor.role === 'admin',
  });

  return buildSpaceTree(spaces, actor);
}

export async function createSpaceRecord(
  payload: CreateSpaceInput,
  actor: AccessPayload,
): Promise<SpaceDto> {
  assertCanCreateOrManage(actor);

  const client = await pool.connect();
  try {
    await client.query('begin');
    const space = await createSpace({ ...payload, createdBy: actor.sub }, client);
    await addSpaceMember(space.id, actor.sub, client);
    const members = await listSpaceMembers(space.id, client);
    await client.query('commit');

    return mapSpace(space, members.map(mapMember), []);
  } catch (err) {
    await client.query('rollback').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function updateSpaceRecord(
  spaceId: string,
  patch: UpdateSpaceInput,
  actor: AccessPayload,
): Promise<SpaceDto> {
  await getSpaceOrThrow(spaceId);
  await assertCanManageSpace(actor, spaceId);

  const updated = await updateSpaceById(spaceId, patch);
  if (!updated) {
    throw new SpacesError(404, 'Space not found');
  }

  const [space] = await buildSpaceTree([updated], actor);
  return space;
}

export async function deleteSpaceRecord(spaceId: string, actor: AccessPayload): Promise<void> {
  await getSpaceOrThrow(spaceId);
  await assertCanManageSpace(actor, spaceId);

  try {
    const deleted = await deleteSpaceById(spaceId);
    if (!deleted) {
      throw new SpacesError(404, 'Space not found');
    }
  } catch (err) {
    // Tickets deliberately have no cascading delete, so deleting their parent space must fail safely.
    if (isForeignKeyViolation(err)) {
      throw new SpacesError(409, 'Space contains tickets and cannot be deleted');
    }

    throw err;
  }
}

export async function listSpaceMembersRecord(
  spaceId: string,
  actor: AccessPayload,
): Promise<MemberDto[]> {
  await getSpaceOrThrow(spaceId);
  await assertCanReadSpace(actor, spaceId);

  const members = await listSpaceMembers(spaceId);
  return members.map(mapMember);
}

export async function addSpaceMemberRecord(
  spaceId: string,
  userId: string,
  actor: AccessPayload,
): Promise<MemberDto> {
  await getSpaceOrThrow(spaceId);
  await assertCanManageSpace(actor, spaceId);

  const user = await findUserById(userId);
  if (!user) {
    throw new SpacesError(404, 'User not found');
  }

  const member = await addSpaceMember(spaceId, userId);
  return mapMember(member);
}

export async function removeSpaceMemberRecord(
  spaceId: string,
  userId: string,
  actor: AccessPayload,
): Promise<void> {
  await getSpaceOrThrow(spaceId);
  await assertCanManageSpace(actor, spaceId);

  const deleted = await removeSpaceMember(spaceId, userId);
  if (!deleted) {
    throw new SpacesError(404, 'Space member not found');
  }
}

export async function listSpaceProjectsRecord(
  spaceId: string,
  actor: AccessPayload,
): Promise<ProjectDto[]> {
  await getSpaceOrThrow(spaceId);
  await assertCanReadSpace(actor, spaceId);

  const projectRows = await listProjectsForSpace({
    spaceId,
    actorId: actor.sub,
    includeAll: actor.role !== 'employee',
  });
  const memberRows = await listProjectMembersByProjectIds(projectRows.map((project) => project.id));
  const members = groupProjectMembers(memberRows);

  return projectRows.map((project) => mapProject(project, members.get(project.id) ?? []));
}

export async function createProjectRecord(
  spaceId: string,
  payload: CreateProjectInput,
  actor: AccessPayload,
): Promise<ProjectDto> {
  await getSpaceOrThrow(spaceId);
  await assertCanManageSpace(actor, spaceId);

  const client = await pool.connect();
  try {
    await client.query('begin');
    const project = await createProject(spaceId, { ...payload, createdBy: actor.sub }, client);

    if (!(await isSpaceMember(spaceId, actor.sub, client))) {
      await addSpaceMember(spaceId, actor.sub, client);
    }
    await addProjectMember(spaceId, project.id, actor.sub, client);

    const members = await listProjectMembers(project.id, client);
    await client.query('commit');

    return mapProject(project, members.map(mapMember));
  } catch (err) {
    await client.query('rollback').catch(() => undefined);

    if (isUniqueViolation(err)) {
      throw new SpacesError(409, 'Project with this name already exists in space');
    }

    throw err;
  } finally {
    client.release();
  }
}

export async function updateProjectRecord(
  spaceId: string,
  projectId: string,
  patch: UpdateProjectInput,
  actor: AccessPayload,
): Promise<ProjectDto> {
  await getProjectOrThrow(spaceId, projectId);
  await assertCanManageSpace(actor, spaceId);

  try {
    const updated = await updateProjectById(spaceId, projectId, patch);
    if (!updated) {
      throw new SpacesError(404, 'Project not found');
    }

    const members = await listProjectMembers(projectId);
    return mapProject(updated, members.map(mapMember));
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new SpacesError(409, 'Project with this name already exists in space');
    }

    throw err;
  }
}

export async function deleteProjectRecord(
  spaceId: string,
  projectId: string,
  actor: AccessPayload,
): Promise<void> {
  await getProjectOrThrow(spaceId, projectId);
  await assertCanManageSpace(actor, spaceId);

  try {
    const deleted = await deleteProjectById(spaceId, projectId);
    if (!deleted) {
      throw new SpacesError(404, 'Project not found');
    }
  } catch (err) {
    // A project with tickets stays intact; users must move or remove its tickets explicitly first.
    if (isForeignKeyViolation(err)) {
      throw new SpacesError(409, 'Project contains tickets and cannot be deleted');
    }

    throw err;
  }
}

export async function listProjectMembersRecord(
  spaceId: string,
  projectId: string,
  actor: AccessPayload,
): Promise<MemberDto[]> {
  await getProjectOrThrow(spaceId, projectId);
  await assertCanReadProject(actor, spaceId, projectId);

  const members = await listProjectMembers(projectId);
  return members.map(mapMember);
}

export async function addProjectMemberRecord(
  spaceId: string,
  projectId: string,
  userId: string,
  actor: AccessPayload,
): Promise<MemberDto> {
  await getProjectOrThrow(spaceId, projectId);
  await assertCanManageSpace(actor, spaceId);

  const user = await findUserById(userId);
  if (!user) {
    throw new SpacesError(404, 'User not found');
  }

  const spaceMember = await findSpaceMember(spaceId, userId);
  if (!spaceMember) {
    throw new SpacesError(400, 'User must be a space member before joining project');
  }

  const member = await addProjectMember(spaceId, projectId, userId);
  return mapMember(member);
}

export async function removeProjectMemberRecord(
  spaceId: string,
  projectId: string,
  userId: string,
  actor: AccessPayload,
): Promise<void> {
  await getProjectOrThrow(spaceId, projectId);
  await assertCanManageSpace(actor, spaceId);

  const deleted = await removeProjectMember(spaceId, projectId, userId);
  if (!deleted) {
    throw new SpacesError(404, 'Project member not found');
  }
}
