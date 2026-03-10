import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { emitSyncEvent } from '../domain/events';
import type {
  CreateTicketCommand,
  DeleteTicketCommand,
  UpdateTicketCommand,
} from '../domain/commands';
import { mergeCreatePayload } from '../domain/commands';
import {
  nowIso,
  toErrorMessage,
  type CreateTicketInput,
  type LocalTicket,
  type UpdateTicketInput,
} from '../domain/models';
import {
  loadTicketsByStrategy,
  readLocalState,
  resetTicketsMemoryCache,
  type DataSourceStrategy,
} from '../infra/dataSource';
import { ticketsDb } from '../infra/dexie';
import { useSyncStore } from './sync';
import { useAuthStore } from '../../../stores/auth';

export const useTicketsStore = defineStore('tickets', () => {
  const initialized = ref(false);
  const tickets = ref<LocalTicket[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const visibleTickets = computed(() => tickets.value.filter((ticket) => !ticket.isDeleted));

  async function emitQueueChanged() {
    emitSyncEvent('queue-changed', {
      size: await ticketsDb.queue.count(),
    });
  }

  async function refreshFromDb() {
    const snapshot = await readLocalState();
    tickets.value = snapshot.tickets;
  }

  async function init() {
    if (initialized.value) return;

    initialized.value = true;
    await refreshFromDb();

    const syncStore = useSyncStore();
    await syncStore.init();
  }

  async function loadTickets(force = false) {
    await init();

    const authStore = useAuthStore();
    const syncStore = useSyncStore();

    loading.value = true;
    error.value = null;

    try {
      const strategy: DataSourceStrategy = !syncStore.online
        ? 'idb_first'
        : force
          ? 'network_first'
          : 'cache_first';

      const result = await loadTicketsByStrategy({
        strategy,
        online: syncStore.online,
        accessToken: authStore.accessToken,
      });

      tickets.value = result.items;

      if (result.lastSyncAt) {
        syncStore.setLastSyncAt(result.lastSyncAt);
      }

      await syncStore.refreshQueueFromDb();
    } catch (loadError) {
      error.value = toErrorMessage(loadError);

      await refreshFromDb();
      await syncStore.refreshQueueFromDb();
    } finally {
      loading.value = false;
    }
  }

  async function createTicket(input: CreateTicketInput) {
    const title = input.title.trim();
    if (!title) {
      throw new Error('Нужно указать заголовок');
    }

    const localId = crypto.randomUUID();
    const timestamp = nowIso();

    const localTicket: LocalTicket = {
      id: localId,
      title,
      description: input.description,
      status: 'open',
      priority: input.priority,
      createdBy: null,
      assignedTo: null,
      updatedAt: timestamp,
      createdAt: timestamp,
      syncStatus: 'queued',
      isLocalOnly: true,
      isDeleted: false,
      baseUpdatedAt: null,
      lastError: null,
      conflict: false,
    };

    const command: CreateTicketCommand = {
      id: crypto.randomUUID(),
      ticketId: localId,
      type: 'create',
      payload: {
        title,
        description: input.description,
        priority: input.priority,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      tries: 0,
      status: 'pending',
      lastError: null,
      baseUpdatedAt: null,
    };

    await ticketsDb.transaction('rw', ticketsDb.tickets, ticketsDb.queue, async () => {
      await ticketsDb.tickets.put(localTicket);
      await ticketsDb.queue.put(command);
    });
    await emitQueueChanged();

    resetTicketsMemoryCache();

    const syncStore = useSyncStore();
    await refreshFromDb();
    await syncStore.refreshQueueFromDb();

    if (syncStore.online) {
      void syncStore.flushQueue();
    }
  }

  async function updateTicket(ticketId: string, patch: UpdateTicketInput) {
    const current = await ticketsDb.tickets.get(ticketId);
    if (!current) return;

    const timestamp = nowIso();
    const nextTicket: LocalTicket = {
      ...current,
      ...patch,
      updatedAt: timestamp,
      syncStatus: 'queued',
      conflict: false,
      lastError: null,
      baseUpdatedAt: current.baseUpdatedAt ?? current.updatedAt,
    };

    const syncStore = useSyncStore();
    const existingCreate = syncStore.queue.find(
      (command): command is CreateTicketCommand =>
        command.ticketId === ticketId && command.type === 'create',
    );

    await ticketsDb.transaction('rw', ticketsDb.tickets, ticketsDb.queue, async () => {
      await ticketsDb.tickets.put(nextTicket);

      if (existingCreate) {
        await ticketsDb.queue.put({
          ...existingCreate,
          payload: mergeCreatePayload(existingCreate.payload, patch),
          updatedAt: timestamp,
        });
        return;
      }

      const command: UpdateTicketCommand = {
        id: crypto.randomUUID(),
        ticketId,
        type: 'update',
        payload: patch,
        createdAt: timestamp,
        updatedAt: timestamp,
        tries: 0,
        status: 'pending',
        lastError: null,
        baseUpdatedAt: current.baseUpdatedAt ?? current.updatedAt,
      };

      await ticketsDb.queue.put(command);
    });
    await emitQueueChanged();

    resetTicketsMemoryCache();

    await refreshFromDb();
    await syncStore.refreshQueueFromDb();

    if (syncStore.online) {
      void syncStore.flushQueue();
    }
  }

  async function removeTicket(ticketId: string) {
    const current = await ticketsDb.tickets.get(ticketId);
    if (!current) return;

    const syncStore = useSyncStore();
    const existingCreate = syncStore.queue.find(
      (command): command is CreateTicketCommand =>
        command.ticketId === ticketId && command.type === 'create',
    );

    if (current.isLocalOnly || existingCreate) {
      await ticketsDb.transaction('rw', ticketsDb.tickets, ticketsDb.queue, async () => {
        await ticketsDb.tickets.delete(ticketId);

        const relatedCommands = (await ticketsDb.queue.toArray()).filter(
          (command) => command.ticketId === ticketId,
        );

        for (const command of relatedCommands) {
          await ticketsDb.queue.delete(command.id);
        }
      });
      await emitQueueChanged();

      resetTicketsMemoryCache();

      await refreshFromDb();
      await syncStore.refreshQueueFromDb();
      return;
    }

    const timestamp = nowIso();
    const nextTicket: LocalTicket = {
      ...current,
      isDeleted: true,
      updatedAt: timestamp,
      syncStatus: 'queued',
      conflict: false,
      lastError: null,
      baseUpdatedAt: current.baseUpdatedAt ?? current.updatedAt,
    };

    const command: DeleteTicketCommand = {
      id: crypto.randomUUID(),
      ticketId,
      type: 'delete',
      payload: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      tries: 0,
      status: 'pending',
      lastError: null,
      baseUpdatedAt: current.baseUpdatedAt ?? current.updatedAt,
    };

    await ticketsDb.transaction('rw', ticketsDb.tickets, ticketsDb.queue, async () => {
      await ticketsDb.tickets.put(nextTicket);
      await ticketsDb.queue.put(command);
    });
    await emitQueueChanged();

    resetTicketsMemoryCache();

    await refreshFromDb();
    await syncStore.refreshQueueFromDb();

    if (syncStore.online) {
      void syncStore.flushQueue();
    }
  }

  return {
    tickets,
    visibleTickets,
    loading,
    error,
    init,
    refreshFromDb,
    loadTickets,
    createTicket,
    updateTicket,
    removeTicket,
  };
});
