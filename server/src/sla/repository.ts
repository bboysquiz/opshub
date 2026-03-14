import type { PoolClient } from 'pg';
import { pool } from '../db';
import type { SlaSettingsRow, UpdateSlaSettingsInput } from './types';

type Queryable = Pick<PoolClient, 'query'>;

const DEFAULT_SLA_SETTINGS = {
  lowMinutes: 1440,
  mediumMinutes: 480,
  highMinutes: 240,
};

function mapRow(row: SlaSettingsRow) {
  return {
    lowMinutes: row.low_minutes,
    mediumMinutes: row.medium_minutes,
    highMinutes: row.high_minutes,
    updatedAt: row.updated_at,
  };
}

export async function getSlaSettings(db: Queryable = pool): Promise<{
  lowMinutes: number;
  mediumMinutes: number;
  highMinutes: number;
  updatedAt: Date | string;
}> {
  const result = await db.query<SlaSettingsRow>(
    `select low_minutes, medium_minutes, high_minutes, updated_at
     from sla_settings
     where id = true`,
  );

  const row = result.rows[0];
  if (row) {
    return mapRow(row);
  }

  const inserted = await db.query<SlaSettingsRow>(
    `insert into sla_settings (id, low_minutes, medium_minutes, high_minutes)
     values (true, $1, $2, $3)
     on conflict (id) do update
       set low_minutes = excluded.low_minutes,
           medium_minutes = excluded.medium_minutes,
           high_minutes = excluded.high_minutes,
           updated_at = now()
     returning low_minutes, medium_minutes, high_minutes, updated_at`,
    [
      DEFAULT_SLA_SETTINGS.lowMinutes,
      DEFAULT_SLA_SETTINGS.mediumMinutes,
      DEFAULT_SLA_SETTINGS.highMinutes,
    ],
  );

  return mapRow(inserted.rows[0]);
}

export async function updateSlaSettings(
  input: UpdateSlaSettingsInput,
  db: Queryable = pool,
): Promise<{
  lowMinutes: number;
  mediumMinutes: number;
  highMinutes: number;
  updatedAt: Date | string;
}> {
  const result = await db.query<SlaSettingsRow>(
    `insert into sla_settings (id, low_minutes, medium_minutes, high_minutes, updated_at)
     values (true, $1, $2, $3, now())
     on conflict (id) do update
       set low_minutes = excluded.low_minutes,
           medium_minutes = excluded.medium_minutes,
           high_minutes = excluded.high_minutes,
           updated_at = now()
     returning low_minutes, medium_minutes, high_minutes, updated_at`,
    [input.lowMinutes, input.mediumMinutes, input.highMinutes],
  );

  return mapRow(result.rows[0]);
}
