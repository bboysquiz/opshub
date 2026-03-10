import { ticketsApi } from '../api/ticketsApi';
import { resetTicketsMemoryCache } from '../infra/dataSource';
import { removeMeta, setMeta, ticketsDb } from '../infra/dexie';
import {
  mergeCreatePayload,
  sortCommands,
  type CreateTicketCommand,
  type DeleteTicketCommand,
  type SyncCommand,
  type UpdateTicketCommand,
} from './commands';
import { emitSyncEvent } from './events';
import { nowIso, toErrorMessage, toLocalTicket } from './models';

async function emitQueueChanged() {
  emitSyncEvent('queue-changed', {
    size: await ticketsDb.queue.count(),
  });
}

async function markFailed(command: SyncCommand, message: string) {
  await ticketsDb.queue.put({
    ...command,
    status: 'failed',
    lastError: message,
    updatedAt: nowIso(),
  });
  await emitQueueChanged();

  const localTicket = await ticketsDb.tickets.get(command.ticketId);
  if (!localTicket) return;

  await ticketsDb.tickets.put({
    ...localTicket,
    syncStatus: 'error',
    lastError: message,
  });
}

async function markConflict(command: SyncCommand, message: string) {
  await ticketsDb.queue.put({
    ...command,
    status: 'conflict',
    lastError: message,
    updatedAt: nowIso(),
  });
  await emitQueueChanged();

  const localTicket = await ticketsDb.tickets.get(command.ticketId);
  if (!localTicket) return;

  await ticketsDb.tickets.put({
    ...localTicket,
    syncStatus: 'conflict',
    conflict: true,
    lastError: message,
  });
}

async function getServerTicket(ticketId: string) {
  const items = await ticketsApi.list();
  return items.find((ticket) => ticket.id === ticketId) ?? null;
}

async function processCreate(command: CreateTicketCommand) {
  const created = await ticketsApi.create(command.payload);

  await ticketsDb.transaction('rw', ticketsDb.tickets, ticketsDb.queue, async () => {
    await ticketsDb.tickets.delete(command.ticketId);
    await ticketsDb.tickets.put(toLocalTicket(created));

    const relatedCommands = (await ticketsDb.queue.toArray()).filter(
      (item) => item.ticketId === command.ticketId && item.id !== command.id,
    );

    for (const item of relatedCommands) {
      if (item.type === 'create') {
        await ticketsDb.queue.put({
          ...item,
          payload: mergeCreatePayload(item.payload, {}),
          ticketId: created.id,
          baseUpdatedAt: created.updatedAt,
          updatedAt: nowIso(),
        });
        continue;
      }

      await ticketsDb.queue.put({
        ...item,
        ticketId: created.id,
        baseUpdatedAt: created.updatedAt,
        updatedAt: nowIso(),
      });
    }

    await ticketsDb.queue.delete(command.id);
  });

  await emitQueueChanged();
  return true;
}

async function processUpdate(command: UpdateTicketCommand) {
  const serverTicket = await getServerTicket(command.ticketId);

  if (!serverTicket) {
    await markFailed(command, 'Тикет не найден на сервере');
    return false;
  }

  if (command.baseUpdatedAt && serverTicket.updatedAt !== command.baseUpdatedAt) {
    await markConflict(command, 'Обнаружен конфликт: тикет уже изменён на сервере');
    return false;
  }

  const updated = await ticketsApi.update(command.ticketId, command.payload);

  await ticketsDb.transaction('rw', ticketsDb.tickets, ticketsDb.queue, async () => {
    await ticketsDb.tickets.put(toLocalTicket(updated));
    await ticketsDb.queue.delete(command.id);
  });

  await emitQueueChanged();
  return true;
}

async function processDelete(command: DeleteTicketCommand) {
  const serverTicket = await getServerTicket(command.ticketId);

  if (!serverTicket) {
    await ticketsDb.transaction('rw', ticketsDb.tickets, ticketsDb.queue, async () => {
      await ticketsDb.tickets.delete(command.ticketId);
      await ticketsDb.queue.delete(command.id);
    });
    await emitQueueChanged();
    return true;
  }

  if (command.baseUpdatedAt && serverTicket.updatedAt !== command.baseUpdatedAt) {
    await markConflict(command, 'Обнаружен конфликт: тикет уже изменён на сервере');
    return false;
  }

  await ticketsApi.remove(command.ticketId);

  await ticketsDb.transaction('rw', ticketsDb.tickets, ticketsDb.queue, async () => {
    await ticketsDb.tickets.delete(command.ticketId);
    await ticketsDb.queue.delete(command.id);
  });

  await emitQueueChanged();
  return true;
}

export async function flushPendingCommands() {
  let syncError: string | null = null;
  let flushed = 0;

  emitSyncEvent('sync-started');
  await setMeta('syncStartedAt', nowIso());
  await removeMeta('lastSyncError');

  try {
    const commands = sortCommands(await ticketsDb.queue.toArray());

    for (const command of commands) {
      if (command.status === 'conflict') {
        continue;
      }

      const processingCommand: SyncCommand = {
        ...command,
        tries: (command.tries ?? 0) + 1,
        status: 'processing',
        lastError: null,
        updatedAt: nowIso(),
      };

      await ticketsDb.queue.put(processingCommand);
      await emitQueueChanged();

      try {
        if (processingCommand.type === 'create') {
          if (await processCreate(processingCommand)) {
            flushed += 1;
          }
        } else if (processingCommand.type === 'update') {
          if (await processUpdate(processingCommand)) {
            flushed += 1;
          }
        } else {
          if (await processDelete(processingCommand)) {
            flushed += 1;
          }
        }
      } catch (processError) {
        syncError = toErrorMessage(processError);
        await markFailed(processingCommand, syncError);
      }
    }

    resetTicketsMemoryCache();

    const lastSyncAt = nowIso();
    emitSyncEvent('sync-finished', { flushed });

    await setMeta('lastSyncAt', lastSyncAt);
    await setMeta('lastFlushedCount', flushed);

    if (syncError) {
      await setMeta('lastSyncError', syncError);
    } else {
      await removeMeta('lastSyncError');
    }

    return {
      lastSyncAt,
      syncError,
    };
  } catch (flushError) {
    syncError = toErrorMessage(flushError);
    emitSyncEvent('sync-failed', { message: syncError });
    await setMeta('lastSyncError', syncError);

    return {
      lastSyncAt: null,
      syncError,
    };
  }
}

export async function retryFailedCommands() {
  await ticketsDb.transaction('rw', ticketsDb.queue, ticketsDb.tickets, async () => {
    const commands = await ticketsDb.queue.toArray();

    for (const command of commands) {
      if (command.status !== 'failed' && command.status !== 'conflict') {
        continue;
      }

      await ticketsDb.queue.put({
        ...command,
        status: 'pending',
        lastError: null,
        updatedAt: nowIso(),
      });

      const localTicket = await ticketsDb.tickets.get(command.ticketId);
      if (!localTicket) continue;

      await ticketsDb.tickets.put({
        ...localTicket,
        syncStatus: 'queued',
        conflict: false,
        lastError: null,
      });
    }
  });

  resetTicketsMemoryCache();
  await removeMeta('lastSyncError');
  await emitQueueChanged();
}
