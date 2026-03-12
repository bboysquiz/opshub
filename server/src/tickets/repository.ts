import type { PoolClient } from 'pg';
import { pool } from '../db';
import type { CreateTicketInput, TicketRow, UpdateTicketInput } from './types';

type Queryable = Pick<PoolClient, 'query'>;

const TICKET_COLUMNS = `
  tickets.id,
  tickets.title,
  tickets.description,
  tickets.status,
  tickets.priority,
  tickets.created_by,
  creator.email as created_by_email,
  tickets.assigned_to,
  assignee.email as assigned_to_email,
  tickets.updated_at,
  tickets.created_at
`;

function baseTicketQuery() {
  return `select ${TICKET_COLUMNS}
     from tickets
     left join users creator on creator.id = tickets.created_by
     left join users assignee on assignee.id = tickets.assigned_to`;
}

export async function listTickets(db: Queryable = pool): Promise<TicketRow[]> {
  const result = await db.query<TicketRow>(
    `${baseTicketQuery()}
     order by created_at desc`,
  );
  return result.rows;
}

export async function getTicketById(id: string, db: Queryable = pool): Promise<TicketRow | null> {
  const result = await db.query<TicketRow>(
    `${baseTicketQuery()}
     where tickets.id = $1`,
    [id],
  );

  return result.rowCount ? result.rows[0] : null;
}

export async function createTicket(
  args: CreateTicketInput & { createdBy: string },
  db: Queryable = pool,
): Promise<TicketRow> {
  const result = await db.query<{ id: string }>(
    `insert into tickets (title, description, priority, created_by, assigned_to)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [args.title, args.description, args.priority, args.createdBy, args.assignedTo ?? null],
  );

  return getTicketById(result.rows[0].id, db) as Promise<TicketRow>;
}

export async function updateTicketById(
  id: string,
  patch: UpdateTicketInput,
  db: Queryable = pool,
): Promise<TicketRow | null> {
  const updates: string[] = [];
  const values: Array<string | null> = [];

  if (patch.title !== undefined) {
    values.push(patch.title);
    updates.push(`title = $${values.length}`);
  }

  if (patch.description !== undefined) {
    values.push(patch.description);
    updates.push(`description = $${values.length}`);
  }

  if (patch.status !== undefined) {
    values.push(patch.status);
    updates.push(`status = $${values.length}`);
  }

  if (patch.priority !== undefined) {
    values.push(patch.priority);
    updates.push(`priority = $${values.length}`);
  }

  if (patch.assignedTo !== undefined) {
    values.push(patch.assignedTo);
    updates.push(`assigned_to = $${values.length}`);
  }

  if (updates.length === 0) return null;

  values.push(id);

  const result = await db.query<{ id: string }>(
    `update tickets
     set ${updates.join(', ')}, updated_at = now()
     where id = $${values.length}
     returning id`,
    values,
  );

  if (!result.rowCount) {
    return null;
  }

  return getTicketById(result.rows[0].id, db);
}

export async function deleteTicketById(id: string, db: Queryable = pool): Promise<boolean> {
  const result = await db.query('delete from tickets where id = $1', [id]);
  return Boolean(result.rowCount);
}
