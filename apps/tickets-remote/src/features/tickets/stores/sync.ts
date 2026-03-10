import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { onSyncEvent } from '../domain/events';
import { flushPendingCommands, retryFailedCommands } from '../domain/syncEngine';
import { readLocalState } from '../infra/dataSource';
import { getMeta, setMeta } from '../infra/dexie';
import type { SyncCommand } from '../domain/commands';
import { useAuthStore } from '../../../stores/auth';

export const useSyncStore = defineStore('tickets-sync', () => {
  const initialized = ref(false);
  const queue = ref<SyncCommand[]>([]);
  const syncError = ref<string | null>(null);
  const syncInProgress = ref(false);
  const lastSyncAt = ref<string | null>(null);
  const lastAutoSyncAt = ref<string | null>(null);
  const lastFlushedCount = ref(0);
  const autoSyncActive = ref(false);
  const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
  let autoSyncIntervalId: number | null = null;

  const queueSize = computed(() => queue.value.length);
  const conflictCount = computed(
    () => queue.value.filter((command) => command.status === 'conflict').length,
  );

  async function refreshQueueFromDb(nextQueue?: SyncCommand[]) {
    if (nextQueue) {
      queue.value = nextQueue;
      return;
    }

    const snapshot = await readLocalState();
    queue.value = snapshot.queue;
  }

  async function handleReconnect() {
    const { useTicketsStore } = await import('./tickets');
    const ticketsStore = useTicketsStore();

    void flushQueue();
    void ticketsStore.loadTickets(true);
  }

  function canAutoSync() {
    if (typeof document === 'undefined') {
      return online.value;
    }

    return online.value && document.visibilityState === 'visible';
  }

  async function markAutoSyncRun() {
    const ts = new Date().toISOString();
    lastAutoSyncAt.value = ts;
    await setMeta('lastAutoSyncAt', ts);
  }

  async function runAutoSync() {
    if (!canAutoSync()) {
      return;
    }

    await markAutoSyncRun();
    await flushQueue();
  }

  function startAutoSync() {
    if (typeof window === 'undefined') {
      autoSyncActive.value = false;
      return;
    }

    if (autoSyncIntervalId !== null) {
      autoSyncActive.value = true;
      return;
    }

    autoSyncIntervalId = window.setInterval(() => {
      void runAutoSync();
    }, 15_000);

    autoSyncActive.value = true;
  }

  function stopAutoSync() {
    if (autoSyncIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(autoSyncIntervalId);
      autoSyncIntervalId = null;
    }

    autoSyncActive.value = false;
  }

  async function init() {
    if (initialized.value) return;

    initialized.value = true;
    await refreshQueueFromDb();
    lastSyncAt.value = (await getMeta('lastSyncAt')) as string | null;
    lastAutoSyncAt.value = (await getMeta('lastAutoSyncAt')) as string | null;
    syncError.value = (await getMeta('lastSyncError')) as string | null;
    lastFlushedCount.value = Number((await getMeta('lastFlushedCount')) ?? 0);

    onSyncEvent('sync-started', () => {
      syncInProgress.value = true;
    });

    onSyncEvent('sync-finished', ({ flushed }) => {
      syncInProgress.value = false;
      lastFlushedCount.value = flushed ?? 0;
    });

    onSyncEvent('sync-failed', ({ message }) => {
      syncInProgress.value = false;
      syncError.value = message ?? null;
    });

    onSyncEvent('queue-changed', () => {
      void refreshQueueFromDb();
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        online.value = true;
        void setMeta('lastOnlineAt', new Date().toISOString());
        startAutoSync();
        void handleReconnect();
      });

      window.addEventListener('offline', () => {
        online.value = false;
        stopAutoSync();
      });

      window.addEventListener('focus', () => {
        void runAutoSync();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          startAutoSync();
          void runAutoSync();
          return;
        }

        stopAutoSync();
      });

      if (document.visibilityState === 'visible' && online.value) {
        startAutoSync();
        void runAutoSync();
      }
    }
  }

  function setLastSyncAt(value: string | null) {
    lastSyncAt.value = value;

    if (value) {
      void setMeta('lastSyncAt', value);
    }
  }

  async function flushQueue() {
    await init();

    const authStore = useAuthStore();
    if (syncInProgress.value || !online.value || !authStore.accessToken) {
      return;
    }

    syncInProgress.value = true;
    syncError.value = null;

    try {
      const result = await flushPendingCommands();

      syncError.value = result.syncError;

      if (result.syncError) {
        await setMeta('lastSyncError', result.syncError);
      }

      if (result.lastSyncAt) {
        setLastSyncAt(result.lastSyncAt);
      }
    } finally {
      syncInProgress.value = false;

      await refreshQueueFromDb();

      const { useTicketsStore } = await import('./tickets');
      const ticketsStore = useTicketsStore();

      await ticketsStore.refreshFromDb();
      await ticketsStore.loadTickets(true);
    }
  }

  async function retryAll() {
    await retryFailedCommands();

    syncError.value = null;
    lastFlushedCount.value = 0;

    await setMeta('lastSyncError', null);

    await refreshQueueFromDb();

    const { useTicketsStore } = await import('./tickets');
    const ticketsStore = useTicketsStore();

    await ticketsStore.refreshFromDb();

    if (online.value) {
      startAutoSync();
      await flushQueue();
    }
  }

  return {
    queue,
    queueSize,
    conflictCount,
    syncError,
    syncInProgress,
    lastSyncAt,
    lastAutoSyncAt,
    lastFlushedCount,
    autoSyncActive,
    online,
    init,
    setLastSyncAt,
    refreshQueueFromDb,
    flushQueue,
    retryAll,
    startAutoSync,
    stopAutoSync,
    runAutoSync,
  };
});
