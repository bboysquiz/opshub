import { createPinia, setActivePinia } from 'pinia';

const {
  authStore,
  emitSyncEvent,
  queueCount,
  queuePut,
  readLocalState,
  resetTicketsMemoryCache,
  syncStore,
  ticketsGet,
  ticketsPut,
  transaction,
} = vi.hoisted(() => ({
  authStore: {
    accessToken: '',
    currentUserId: 'user-1',
    currentUserEmail: 'creator@example.com',
  },
  emitSyncEvent: vi.fn(),
  queueCount: vi.fn(),
  queuePut: vi.fn(),
  readLocalState: vi.fn(),
  resetTicketsMemoryCache: vi.fn(),
  syncStore: {
    queue: [],
    online: false,
    init: vi.fn(),
    refreshBrowserOnlineState: vi.fn(),
    refreshQueueFromDb: vi.fn(),
    flushQueue: vi.fn(),
  },
  ticketsGet: vi.fn(),
  ticketsPut: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../domain/events', () => ({
  emitSyncEvent,
}));

vi.mock('../infra/dataSource', () => ({
  loadTicketsByStrategy: vi.fn(),
  readLocalState,
  resetTicketsMemoryCache,
}));

vi.mock('../infra/dexie', () => ({
  ticketsDb: {
    tickets: {
      get: ticketsGet,
      put: ticketsPut,
    },
    queue: {
      count: queueCount,
      put: queuePut,
    },
    transaction,
  },
}));

vi.mock('./sync', () => ({
  useSyncStore: () => syncStore,
}));

vi.mock('../../../stores/auth', () => ({
  useAuthStore: () => authStore,
}));

import { useTicketsStore } from './tickets';

describe('tickets store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    emitSyncEvent.mockReset();
    queueCount.mockResolvedValue(1);
    queuePut.mockReset();
    readLocalState.mockResolvedValue({ tickets: [], queue: [] });
    resetTicketsMemoryCache.mockReset();
    syncStore.queue = [];
    syncStore.online = false;
    syncStore.init.mockResolvedValue(undefined);
    syncStore.refreshBrowserOnlineState.mockReturnValue(false);
    syncStore.refreshQueueFromDb.mockResolvedValue(undefined);
    syncStore.flushQueue.mockResolvedValue(undefined);
    ticketsGet.mockReset();
    ticketsPut.mockReset();
    transaction.mockImplementation(
      async (_mode: string, _tickets: unknown, _queue: unknown, callback: () => Promise<void>) => {
        await callback();
      },
    );
  });

  it('stores project relation fields in local ticket and queued create command', async () => {
    const store = useTicketsStore();

    await store.createTicket({
      projectId: 'project-1',
      projectName: 'Support',
      spaceId: 'space-1',
      spaceName: 'Ops',
      title: '  Offline ticket  ',
      description: 'Description',
      priority: 'high',
      assignedTo: 'agent-1',
      dueAt: '2025-01-02T10:00:00.000Z',
    });

    expect(ticketsPut).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        projectName: 'Support',
        spaceId: 'space-1',
        spaceName: 'Ops',
        title: 'Offline ticket',
        syncStatus: 'queued',
        isLocalOnly: true,
      }),
    );
    expect(queuePut).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'create',
        payload: expect.objectContaining({
          projectId: 'project-1',
          projectName: 'Support',
          spaceId: 'space-1',
          spaceName: 'Ops',
          title: 'Offline ticket',
        }),
      }),
    );
    expect(resetTicketsMemoryCache).toHaveBeenCalledTimes(1);
  });

  it('does not send an empty projectId in queued create payload', async () => {
    const store = useTicketsStore();

    await store.createTicket({
      projectId: '',
      title: 'Fallback ticket',
      description: '',
      priority: 'medium',
    });

    expect(queuePut).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'create',
        payload: expect.objectContaining({
          projectId: undefined,
          title: 'Fallback ticket',
        }),
      }),
    );
  });

  it('stores project relation fields in queued update command', async () => {
    ticketsGet.mockResolvedValue({
      id: 'ticket-1',
      projectId: 'project-1',
      projectName: 'Support',
      spaceId: 'space-1',
      spaceName: 'Ops',
      title: 'Existing ticket',
      description: 'Description',
      status: 'open',
      priority: 'medium',
      createdBy: 'user-1',
      createdByEmail: 'creator@example.com',
      assignedTo: null,
      assignedToEmail: null,
      dueAt: null,
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      syncStatus: 'synced',
      isLocalOnly: false,
      isDeleted: false,
      baseUpdatedAt: '2026-01-01T00:00:00.000Z',
      lastError: null,
      conflict: false,
    });

    const store = useTicketsStore();

    const updated = await store.updateTicket('ticket-1', {
      projectId: 'project-2',
      projectName: 'Payments',
      spaceId: 'space-2',
      spaceName: 'Finance',
    });

    expect(updated).toBe(true);
    expect(ticketsPut).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-2',
        projectName: 'Payments',
        spaceId: 'space-2',
        spaceName: 'Finance',
        syncStatus: 'queued',
      }),
    );
    expect(queuePut).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'update',
        payload: expect.objectContaining({
          projectId: 'project-2',
          projectName: 'Payments',
          spaceId: 'space-2',
          spaceName: 'Finance',
        }),
      }),
    );
  });
});
