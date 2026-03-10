import Dexie, { type Table } from 'dexie';
import type { SyncCommand } from '../domain/commands';
import type { LocalTicket } from '../domain/models';

export type MetaValue = string | number | boolean | null;

export type MetaRow = {
  key: string;
  value: MetaValue;
};

class TicketsDb extends Dexie {
  tickets!: Table<LocalTicket, string>;
  queue!: Table<SyncCommand, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('opshub_tickets_remote');

    this.version(1).stores({
      tickets: 'id, updatedAt, syncStatus, isDeleted',
      queue: 'id, ticketId, type, status, createdAt',
      meta: 'key',
    });
  }
}

export const ticketsDb = new TicketsDb();

export async function getMeta(key: string): Promise<MetaValue> {
  const row = await ticketsDb.meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: MetaValue): Promise<void> {
  await ticketsDb.meta.put({ key, value });
}

export async function removeMeta(key: string): Promise<void> {
  await ticketsDb.meta.delete(key);
}
