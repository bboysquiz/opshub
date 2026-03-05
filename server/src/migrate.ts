import path from 'node:path';
import { runMigrations } from './db/migrations/service';

const migrationsDir = path.resolve(__dirname, '../migrations');

runMigrations(migrationsDir).catch((err: unknown) => {
  console.error('[migrate] failed');
  console.error(err);
  process.exit(1);
});
