import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../db', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { listProjectsBySpaceIds } from './repository';
import type { ProjectRow } from './types';

function createDb(rows: ProjectRow[] = []) {
  const query = vi.fn(async (_sql: string, _values?: unknown[]) => ({
    command: 'SELECT',
    fields: [],
    oid: 0,
    rows,
    rowCount: rows.length,
  }));
  const db: Pick<PoolClient, 'query'> = {
    query: query as unknown as PoolClient['query'],
  };

  return { db, query };
}

describe('spaces repository project ticket statistics', () => {
  it('aggregates total, open and in-progress tickets for every listed project', async () => {
    const { db, query } = createDb();
    const spaceId = '11111111-1111-4111-8111-111111111111';
    const actorId = '22222222-2222-4222-8222-222222222222';

    await listProjectsBySpaceIds(
      {
        spaceIds: [spaceId],
        actorId,
        includeAll: false,
      },
      db,
    );

    const [sql, values] = query.mock.calls[0];
    const queryText = String(sql);

    expect(queryText).toContain('left join lateral');
    expect(queryText).toContain('count(*)::integer as ticket_count');
    expect(queryText).toContain("tickets.status = 'open'");
    expect(queryText).toContain("tickets.status = 'in_progress'");
    expect(queryText).toContain('where tickets.project_id = projects.id');
    expect(values).toEqual([[spaceId], actorId, false]);
  });
});
