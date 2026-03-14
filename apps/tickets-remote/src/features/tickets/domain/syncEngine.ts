import { ticketsApi } from '../api/ticketsApi';
import { resetTicketsMemoryCache } from '../infra/dataSource';
import { isNetworkLikeError } from '../infra/network';
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

async function markQueued(command: SyncCommand) {
  await ticketsDb.queue.put({
    ...command,
    status: 'pending',
    lastError: null,
    updatedAt: nowIso(),
  });
  await emitQueueChanged();

  const localTicket = await ticketsDb.tickets.get(command.ticketId);
  if (!localTicket) return;

  await ticketsDb.tickets.put({
    ...localTicket,
    syncStatus: 'queued',
    conflict: false,
    lastError: null,
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
  let connectivityLost = false;
  let processed = 0;

  const commands = sortCommands(await ticketsDb.queue.toArray()).filter(
    (command) => command.status !== 'conflict',
  );
  const total = commands.length;

  emitSyncEvent('sync-started', {
    total,
    processed: 0,
    remaining: total,
  });
  await setMeta('syncStartedAt', nowIso());
  await removeMeta('lastSyncError');

  try {
    for (const command of commands) {
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

        if (isNetworkLikeError(processError)) {
          connectivityLost = true;
          await markQueued(processingCommand);
          processed += 1;
          emitSyncEvent('sync-progress', {
            total,
            processed,
            remaining: Math.max(total - processed, 0),
          });
          break;
        }

        await markFailed(processingCommand, syncError);
      }

      processed += 1;
      emitSyncEvent('sync-progress', {
        total,
        processed,
        remaining: Math.max(total - processed, 0),
      });
    }

    resetTicketsMemoryCache();

    await setMeta('lastFlushedCount', flushed);

    if (connectivityLost) {
      emitSyncEvent('sync-failed', {
        message: syncError ?? undefined,
        total,
        processed,
        remaining: Math.max(total - processed, 0),
      });
      await setMeta('lastSyncError', syncError);

      return {
        lastSyncAt: null,
        syncError,
        connectivityLost,
      };
    }

    const lastSyncAt = nowIso();
    emitSyncEvent('sync-finished', {
      flushed,
      total,
      processed,
      remaining: Math.max(total - processed, 0),
    });

    await setMeta('lastSyncAt', lastSyncAt);

    if (syncError) {
      await setMeta('lastSyncError', syncError);
    } else {
      await removeMeta('lastSyncError');
    }

    return {
      lastSyncAt,
      syncError,
      connectivityLost,
    };
  } catch (flushError) {
    syncError = toErrorMessage(flushError);
    emitSyncEvent('sync-failed', { message: syncError });
    await setMeta('lastSyncError', syncError);

    return {
      lastSyncAt: null,
      syncError,
      connectivityLost: isNetworkLikeError(flushError),
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
