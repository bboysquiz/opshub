import type { PoolClient } from 'pg';

type Queryable = Pick<PoolClient, 'query'>;

export async function ensureSchemaMigrationsTable(db: Queryable): Promise<void> {
  await db.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

export async function getAppliedMigrations(db: Queryable): Promise<Set<string>> {
  const result = await db.query<{ filename: string }>('select filename from schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
}

export async function markMigrationApplied(db: Queryable, fileName: string): Promise<void> {
  await db.query('insert into schema_migrations(filename) values ($1)', [fileName]);
}
