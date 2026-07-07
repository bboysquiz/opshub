import type { PoolClient } from 'pg';
import { pool } from '../db';
import type {
  CreateProjectInput,
  CreateSpaceInput,
  ProjectMemberRow,
  ProjectRow,
  SpaceMemberRow,
  SpaceRow,
  UpdateProjectInput,
  UpdateSpaceInput,
} from './types';

type Queryable = Pick<PoolClient, 'query'>;

const SPACE_COLUMNS = `
  spaces.id,
  spaces.name,
  spaces.description,
  spaces.created_by,
  creator.email as created_by_email,
  spaces.updated_at,
  spaces.created_at
`;

const PROJECT_COLUMNS = `
  projects.id,
  projects.space_id,
  projects.name,
  projects.description,
  projects.archived_at,
  projects.created_by,
  creator.email as created_by_email,
  projects.updated_at,
  projects.created_at
`;

export async function listSpacesForActor(
  args: { actorId: string; includeAll: boolean },
  db: Queryable = pool,
): Promise<SpaceRow[]> {
  const result = await db.query<SpaceRow>(
    `select ${SPACE_COLUMNS}
     from spaces
     left join users creator on creator.id = spaces.created_by
     where $2::boolean
        or exists (
          select 1
          from space_members
          where space_members.space_id = spaces.id
            and space_members.user_id = $1
        )
     order by spaces.created_at asc, spaces.name asc`,
    [args.actorId, args.includeAll],
  );

  return result.rows;
}

export async function findSpaceById(
  spaceId: string,
  db: Queryable = pool,
): Promise<SpaceRow | null> {
  const result = await db.query<SpaceRow>(
    `select ${SPACE_COLUMNS}
     from spaces
     left join users creator on creator.id = spaces.created_by
     where spaces.id = $1
     limit 1`,
    [spaceId],
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function createSpace(
  payload: CreateSpaceInput & { createdBy: string },
  db: Queryable = pool,
): Promise<SpaceRow> {
  const result = await db.query<{ id: string }>(
    `insert into spaces (name, description, created_by)
     values ($1, $2, $3)
     returning id`,
    [payload.name, payload.description, payload.createdBy],
  );

  return findSpaceById(result.rows[0].id, db) as Promise<SpaceRow>;
}

export async function updateSpaceById(
  spaceId: string,
  patch: UpdateSpaceInput,
  db: Queryable = pool,
): Promise<SpaceRow | null> {
  const fields: string[] = [];
  const values: string[] = [];

  if (patch.name !== undefined) {
    values.push(patch.name);
    fields.push(`name = $${values.length}`);
  }

  if (patch.description !== undefined) {
    values.push(patch.description);
    fields.push(`description = $${values.length}`);
  }

  if (fields.length === 0) return null;

  values.push(spaceId);
  const result = await db.query<{ id: string }>(
    `update spaces
     set ${fields.join(', ')}, updated_at = now()
     where id = $${values.length}
     returning id`,
    values,
  );

  if (!result.rowCount) {
    return null;
  }

  return findSpaceById(result.rows[0].id, db);
}

export async function listSpaceMembers(
  spaceId: string,
  db: Queryable = pool,
): Promise<SpaceMemberRow[]> {
  const result = await db.query<SpaceMemberRow>(
    `select
       space_members.space_id,
       users.id as user_id,
       users.email,
       users.role,
       space_members.created_at
     from space_members
     join users on users.id = space_members.user_id
     where space_members.space_id = $1
     order by users.email asc`,
    [spaceId],
  );

  return result.rows;
}

export async function listSpaceMembersBySpaceIds(
  spaceIds: string[],
  db: Queryable = pool,
): Promise<SpaceMemberRow[]> {
  if (spaceIds.length === 0) return [];

  const result = await db.query<SpaceMemberRow>(
    `select
       space_members.space_id,
       users.id as user_id,
       users.email,
       users.role,
       space_members.created_at
     from space_members
     join users on users.id = space_members.user_id
     where space_members.space_id = any($1::uuid[])
     order by users.email asc`,
    [spaceIds],
  );

  return result.rows;
}

export async function findSpaceMember(
  spaceId: string,
  userId: string,
  db: Queryable = pool,
): Promise<SpaceMemberRow | null> {
  const result = await db.query<SpaceMemberRow>(
    `select
       space_members.space_id,
       users.id as user_id,
       users.email,
       users.role,
       space_members.created_at
     from space_members
     join users on users.id = space_members.user_id
     where space_members.space_id = $1
       and space_members.user_id = $2
     limit 1`,
    [spaceId, userId],
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function isSpaceMember(
  spaceId: string,
  userId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query<{ exists: boolean }>(
    `select exists (
       select 1
       from space_members
       where space_id = $1
         and user_id = $2
     )`,
    [spaceId, userId],
  );

  return result.rows[0]?.exists ?? false;
}

export async function addSpaceMember(
  spaceId: string,
  userId: string,
  db: Queryable = pool,
): Promise<SpaceMemberRow> {
  await db.query(
    `insert into space_members (space_id, user_id)
     values ($1, $2)
     on conflict do nothing`,
    [spaceId, userId],
  );

  return findSpaceMember(spaceId, userId, db) as Promise<SpaceMemberRow>;
}

export async function removeSpaceMember(
  spaceId: string,
  userId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    `delete from space_members
     where space_id = $1
       and user_id = $2`,
    [spaceId, userId],
  );

  return Boolean(result.rowCount);
}

export async function listProjectsForSpace(
  args: { spaceId: string; actorId: string; includeAll: boolean },
  db: Queryable = pool,
): Promise<ProjectRow[]> {
  const result = await db.query<ProjectRow>(
    `select ${PROJECT_COLUMNS}
     from projects
     left join users creator on creator.id = projects.created_by
     where projects.space_id = $1
       and (
         $3::boolean
         or exists (
           select 1
           from project_members
           where project_members.project_id = projects.id
             and project_members.user_id = $2
         )
       )
     order by (projects.archived_at is not null) asc, projects.created_at asc, projects.name asc`,
    [args.spaceId, args.actorId, args.includeAll],
  );

  return result.rows;
}

export async function listProjectsBySpaceIds(
  args: { spaceIds: string[]; actorId: string; includeAll: boolean },
  db: Queryable = pool,
): Promise<ProjectRow[]> {
  if (args.spaceIds.length === 0) return [];

  const result = await db.query<ProjectRow>(
    `select ${PROJECT_COLUMNS}
     from projects
     left join users creator on creator.id = projects.created_by
     where projects.space_id = any($1::uuid[])
       and (
         $3::boolean
         or exists (
           select 1
           from project_members
           where project_members.project_id = projects.id
             and project_members.user_id = $2
         )
       )
     order by (projects.archived_at is not null) asc, projects.created_at asc, projects.name asc`,
    [args.spaceIds, args.actorId, args.includeAll],
  );

  return result.rows;
}

export async function findProjectById(
  spaceId: string,
  projectId: string,
  db: Queryable = pool,
): Promise<ProjectRow | null> {
  const result = await db.query<ProjectRow>(
    `select ${PROJECT_COLUMNS}
     from projects
     left join users creator on creator.id = projects.created_by
     where projects.space_id = $1
       and projects.id = $2
     limit 1`,
    [spaceId, projectId],
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function createProject(
  spaceId: string,
  payload: CreateProjectInput & { createdBy: string },
  db: Queryable = pool,
): Promise<ProjectRow> {
  const result = await db.query<{ id: string }>(
    `insert into projects (space_id, name, description, created_by)
     values ($1, $2, $3, $4)
     returning id`,
    [spaceId, payload.name, payload.description, payload.createdBy],
  );

  return findProjectById(spaceId, result.rows[0].id, db) as Promise<ProjectRow>;
}

export async function updateProjectById(
  spaceId: string,
  projectId: string,
  patch: UpdateProjectInput,
  db: Queryable = pool,
): Promise<ProjectRow | null> {
  const fields: string[] = [];
  const values: Array<string | null> = [];

  if (patch.name !== undefined) {
    values.push(patch.name);
    fields.push(`name = $${values.length}`);
  }

  if (patch.description !== undefined) {
    values.push(patch.description);
    fields.push(`description = $${values.length}`);
  }

  if (patch.archivedAt !== undefined) {
    values.push(patch.archivedAt);
    fields.push(`archived_at = $${values.length}`);
  }

  if (fields.length === 0) return null;

  values.push(spaceId, projectId);
  const result = await db.query<{ id: string }>(
    `update projects
     set ${fields.join(', ')}, updated_at = now()
     where space_id = $${values.length - 1}
       and id = $${values.length}
     returning id`,
    values,
  );

  if (!result.rowCount) {
    return null;
  }

  return findProjectById(spaceId, result.rows[0].id, db);
}

export async function listProjectMembers(
  projectId: string,
  db: Queryable = pool,
): Promise<ProjectMemberRow[]> {
  const result = await db.query<ProjectMemberRow>(
    `select
       project_members.project_id,
       project_members.space_id,
       users.id as user_id,
       users.email,
       users.role,
       project_members.created_at
     from project_members
     join users on users.id = project_members.user_id
     where project_members.project_id = $1
     order by users.email asc`,
    [projectId],
  );

  return result.rows;
}

export async function listProjectMembersByProjectIds(
  projectIds: string[],
  db: Queryable = pool,
): Promise<ProjectMemberRow[]> {
  if (projectIds.length === 0) return [];

  const result = await db.query<ProjectMemberRow>(
    `select
       project_members.project_id,
       project_members.space_id,
       users.id as user_id,
       users.email,
       users.role,
       project_members.created_at
     from project_members
     join users on users.id = project_members.user_id
     where project_members.project_id = any($1::uuid[])
     order by users.email asc`,
    [projectIds],
  );

  return result.rows;
}

export async function findProjectMember(
  spaceId: string,
  projectId: string,
  userId: string,
  db: Queryable = pool,
): Promise<ProjectMemberRow | null> {
  const result = await db.query<ProjectMemberRow>(
    `select
       project_members.project_id,
       project_members.space_id,
       users.id as user_id,
       users.email,
       users.role,
       project_members.created_at
     from project_members
     join users on users.id = project_members.user_id
     where project_members.space_id = $1
       and project_members.project_id = $2
       and project_members.user_id = $3
     limit 1`,
    [spaceId, projectId, userId],
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function isProjectMember(
  projectId: string,
  userId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query<{ exists: boolean }>(
    `select exists (
       select 1
       from project_members
       where project_id = $1
         and user_id = $2
     )`,
    [projectId, userId],
  );

  return result.rows[0]?.exists ?? false;
}

export async function addProjectMember(
  spaceId: string,
  projectId: string,
  userId: string,
  db: Queryable = pool,
): Promise<ProjectMemberRow> {
  await db.query(
    `insert into project_members (project_id, space_id, user_id)
     values ($1, $2, $3)
     on conflict do nothing`,
    [projectId, spaceId, userId],
  );

  return findProjectMember(spaceId, projectId, userId, db) as Promise<ProjectMemberRow>;
}

export async function removeProjectMember(
  spaceId: string,
  projectId: string,
  userId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    `delete from project_members
     where space_id = $1
       and project_id = $2
       and user_id = $3`,
    [spaceId, projectId, userId],
  );

  return Boolean(result.rowCount);
}
