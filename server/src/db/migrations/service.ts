import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pool } from '../pool';
import {
  ensureSchemaMigrationsTable,
  getAppliedMigrations,
  markMigrationApplied,
} from './repository';

export async function runMigrations(migrationsDir: string): Promise<void> {
  const client = await pool.connect();

  try {
    await ensureSchemaMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    const files = (await fs.readdir(migrationsDir))
      .filter((fileName) => fileName.endsWith('.sql'))
      .sort();

    for (const fileName of files) {
      if (applied.has(fileName)) {
        console.log(`[migrate] skip ${fileName}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, fileName), 'utf8');

      await client.query('begin');
      try {
        await client.query(sql);
        await markMigrationApplied(client, fileName);
        await client.query('commit');
        console.log(`[migrate] applied ${fileName}`);
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }

    console.log('[migrate] done');
  } finally {
    client.release();
    await pool.end();
  }
}
