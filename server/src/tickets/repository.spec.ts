import type { PoolClient } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import {
  findFirstProjectIdForActor,
  getTicketByIdForActor,
  listTicketsForActor,
} from './repository';
import type { TicketRow } from './types';

const actorId = '11111111-1111-4111-8111-111111111111';
const ticketId = '22222222-2222-4222-8222-222222222222';

function createDb<T extends object>(rows: T[] = []) {
  const query = vi.fn(async (_sql: string, _values?: unknown[]) => ({
    command: 'SELECT',
    fields: [],
    oid: 0,
    rows,
    rowCount: rows.length,
  }));

  // `PoolClient['query']` имеет перегрузки под разные query config; для unit-теста нужен только общий контракт "SQL + params -> rows".
  const db: Pick<PoolClient, 'query'> = {
    query: query as unknown as PoolClient['query'],
  };

  return { db, query };
}

describe('tickets repository project membership filters', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('scopes ticket list by actor project membership', async () => {
    const { db, query } = createDb<TicketRow>();

    await listTicketsForActor(actorId, db);

    const [sql, values] = query.mock.calls[0];
    expect(String(sql)).toContain('from project_members');
    expect(String(sql)).toContain('project_members.project_id = tickets.project_id');
    expect(String(sql)).toContain('project_members.user_id = $1');
    expect(values).toEqual([actorId]);
  });

  it('scopes single-ticket reads by actor project membership', async () => {
    const { db, query } = createDb<TicketRow>();

    await getTicketByIdForActor(ticketId, actorId, db);

    const [sql, values] = query.mock.calls[0];
    expect(String(sql)).toContain('where tickets.id = $1');
    expect(String(sql)).toContain('from project_members');
    expect(String(sql)).toContain('project_members.project_id = tickets.project_id');
    expect(String(sql)).toContain('project_members.user_id = $2');
    expect(values).toEqual([ticketId, actorId]);
  });

  it('uses only actor project memberships for create fallback project', async () => {
    const { db, query } = createDb<{ id: string }>();

    await findFirstProjectIdForActor(actorId, db);

    const [sql, values] = query.mock.calls[0];
    expect(String(sql)).toContain('join project_members');
    expect(String(sql)).toContain('project_members.project_id = projects.id');
    expect(String(sql)).toContain('project_members.user_id = $1');
    expect(String(sql)).toContain('projects.archived_at is null');
    expect(values).toEqual([actorId]);
  });
});
