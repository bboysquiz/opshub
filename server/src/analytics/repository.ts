import type { PoolClient } from 'pg';
import { pool } from '../db';
import type { AnalyticsTicketRow } from './types';

type Queryable = Pick<PoolClient, 'query'>;

export async function listAnalyticsTickets(db: Queryable = pool): Promise<AnalyticsTicketRow[]> {
  const result = await db.query<AnalyticsTicketRow>(
    `select
       tickets.id,
       tickets.title,
       tickets.description,
       tickets.status,
       tickets.priority,
       tickets.created_at,
       tickets.updated_at,
       tickets.created_by,
       creator.email as created_by_email,
       creator.role as created_by_role,
       tickets.assigned_to,
       assignee.email as assigned_to_email,
       assignee.role as assigned_to_role
     from tickets
     left join users creator on creator.id = tickets.created_by
     left join users assignee on assignee.id = tickets.assigned_to
     order by tickets.created_at desc`,
  );

  return result.rows;
}
