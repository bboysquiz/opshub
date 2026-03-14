import type { PoolClient } from 'pg';
import { pool } from '../db';
import type { ActivityEventRow, ActivityFeedCursor, CreateActivityEventInput } from './types';

type Queryable = Pick<PoolClient, 'query'>;

const ACTIVITY_EVENT_COLUMNS = `
  id,
  actor_id,
  actor_email,
  kind,
  title,
  description,
  resource_type,
  resource_id,
  resource_path,
  created_at
`;

export async function createActivityEvent(
  input: CreateActivityEventInput,
  db: Queryable = pool,
): Promise<ActivityEventRow> {
  const result = await db.query<ActivityEventRow>(
    `insert into activity_events (
       actor_id,
       actor_email,
       kind,
       title,
       description,
       resource_type,
       resource_id,
       resource_path
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning ${ACTIVITY_EVENT_COLUMNS}`,
    [
      input.actorId,
      input.actorEmail,
      input.kind,
      input.title,
      input.description,
      input.resourceType,
      input.resourceId,
      input.resourcePath,
    ],
  );

  return result.rows[0];
}

export async function listActivityEvents(
  options: {
    limit?: number;
    cursor?: ActivityFeedCursor | null;
  } = {},
  db: Queryable = pool,
): Promise<ActivityEventRow[]> {
  const { limit = 20, cursor = null } = options;
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.trunc(limit))) : 20;
  const result = cursor
    ? await db.query<ActivityEventRow>(
        `select ${ACTIVITY_EVENT_COLUMNS}
         from activity_events
         where (created_at, id) < ($1::timestamptz, $2::uuid)
         order by created_at desc, id desc
         limit $3`,
        [cursor.createdAt, cursor.id, safeLimit],
      )
    : await db.query<ActivityEventRow>(
        `select ${ACTIVITY_EVENT_COLUMNS}
         from activity_events
         order by created_at desc, id desc
         limit $1`,
        [safeLimit],
      );

  return result.rows;
}
