import type { CreateTicketCommand, SyncCommand, UpdateTicketCommand } from './commands';
import type { CreateTicketInput, LocalTicket, TicketDto, UpdateTicketInput } from './models';

const mocks = vi.hoisted(() => ({
  emitSyncEvent: vi.fn(),
  isNetworkLikeError: vi.fn(),
  queueCount: vi.fn(),
  queueDelete: vi.fn(),
  queuePut: vi.fn(),
  queueRows: [] as SyncCommand[],
  queueToArray: vi.fn(),
  removeMeta: vi.fn(),
  resetTicketsMemoryCache: vi.fn(),
  setMeta: vi.fn(),
  ticketRows: new Map<string, LocalTicket>(),
  ticketsCreate: vi.fn(),
  ticketsDelete: vi.fn(),
  ticketsGet: vi.fn(),
  ticketsList: vi.fn(),
  ticketsPut: vi.fn(),
  ticketsRemove: vi.fn(),
  ticketsUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../api/ticketsApi', () => ({
  ticketsApi: {
    list: mocks.ticketsList,
    create: mocks.ticketsCreate,
    update: mocks.ticketsUpdate,
    remove: mocks.ticketsRemove,
  },
}));

vi.mock('../infra/dataSource', () => ({
  resetTicketsMemoryCache: mocks.resetTicketsMemoryCache,
}));

vi.mock('../infra/network', () => ({
  isNetworkLikeError: mocks.isNetworkLikeError,
}));

vi.mock('../infra/dexie', () => ({
  removeMeta: mocks.removeMeta,
  setMeta: mocks.setMeta,
  ticketsDb: {
    tickets: {
      delete: mocks.ticketsDelete,
      get: mocks.ticketsGet,
      put: mocks.ticketsPut,
    },
    queue: {
      count: mocks.queueCount,
      delete: mocks.queueDelete,
      put: mocks.queuePut,
      toArray: mocks.queueToArray,
    },
    transaction: mocks.transaction,
  },
}));

vi.mock('./events', () => ({
  emitSyncEvent: mocks.emitSyncEvent,
}));

import { flushPendingCommands } from './syncEngine';

const timestamp = '2026-01-01T00:00:00.000Z';

type CreateCommandOverrides = Partial<Omit<CreateTicketCommand, 'payload' | 'type'>> & {
  payload?: Partial<CreateTicketInput>;
};

type UpdateCommandOverrides = Partial<Omit<UpdateTicketCommand, 'payload' | 'type'>> & {
  payload?: Partial<UpdateTicketInput>;
};

function makeTicketDto(overrides: Partial<TicketDto> = {}): TicketDto {
  return {
    id: 'ticket-1',
    projectId: 'project-1',
    projectName: 'Support',
    spaceId: 'space-1',
    spaceName: 'Ops',
    title: 'Offline ticket',
    description: 'Description',
    status: 'open',
    priority: 'medium',
    createdBy: 'user-1',
    createdByEmail: 'creator@example.com',
    assignedTo: null,
    assignedToEmail: null,
    dueAt: null,
    updatedAt: timestamp,
    createdAt: timestamp,
    ...overrides,
  };
}

function makeLocalTicket(overrides: Partial<LocalTicket> = {}): LocalTicket {
  return {
    ...makeTicketDto(),
    syncStatus: 'queued',
    isLocalOnly: false,
    isDeleted: false,
    baseUpdatedAt: timestamp,
    lastError: null,
    conflict: false,
    ...overrides,
  };
}

function makeCreateCommand(overrides: CreateCommandOverrides = {}): CreateTicketCommand {
  const { payload, ...commandOverrides } = overrides;

  return {
    id: 'command-create-1',
    ticketId: 'local-ticket-1',
    ...commandOverrides,
    type: 'create',
    payload: {
      projectId: 'project-1',
      projectName: 'Support',
      spaceId: 'space-1',
      spaceName: 'Ops',
      title: 'Offline ticket',
      description: 'Description',
      priority: 'medium',
      assignedTo: null,
      dueAt: null,
      ...payload,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    tries: 0,
    status: 'pending',
    lastError: null,
    baseUpdatedAt: null,
  };
}

function makeUpdateCommand(overrides: UpdateCommandOverrides = {}): UpdateTicketCommand {
  const { payload, ...commandOverrides } = overrides;

  return {
    id: 'command-update-1',
    ticketId: 'ticket-1',
    ...commandOverrides,
    type: 'update',
    payload: {
      title: 'Updated title',
      ...payload,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    tries: 0,
    status: 'pending',
    lastError: null,
    baseUpdatedAt: timestamp,
  };
}

function forbiddenProjectError() {
  return Object.assign(new Error('Forbidden project'), { status: 403 });
}

describe('ticket sync engine project relation handling', () => {
  beforeEach(() => {
    mocks.emitSyncEvent.mockReset();
    mocks.isNetworkLikeError.mockReturnValue(false);
    mocks.queueRows.length = 0;
    mocks.ticketRows.clear();
    mocks.removeMeta.mockResolvedValue(undefined);
    mocks.resetTicketsMemoryCache.mockReset();
    mocks.setMeta.mockResolvedValue(undefined);
    mocks.ticketsCreate.mockReset();
    mocks.ticketsDelete.mockReset();
    mocks.ticketsGet.mockImplementation(async (id: string) => mocks.ticketRows.get(id) ?? null);
    mocks.ticketsList.mockResolvedValue([]);
    mocks.ticketsPut.mockImplementation(async (ticket: LocalTicket) => {
      mocks.ticketRows.set(ticket.id, ticket);
    });
    mocks.ticketsRemove.mockReset();
    mocks.ticketsUpdate.mockReset();
    mocks.queueCount.mockImplementation(async () => mocks.queueRows.length);
    mocks.queueDelete.mockImplementation(async (id: string) => {
      const index = mocks.queueRows.findIndex((command) => command.id === id);
      if (index >= 0) {
        mocks.queueRows.splice(index, 1);
      }
    });
    mocks.queuePut.mockImplementation(async (command: SyncCommand) => {
      const index = mocks.queueRows.findIndex((item) => item.id === command.id);
      if (index >= 0) {
        mocks.queueRows[index] = command;
      } else {
        mocks.queueRows.push(command);
      }
    });
    mocks.queueToArray.mockImplementation(async () => [...mocks.queueRows]);
    mocks.transaction.mockImplementation(async (_mode: string, ...args: unknown[]) => {
      const callback = args[args.length - 1];
      if (typeof callback !== 'function') {
        throw new Error('Dexie transaction callback is missing');
      }

      await callback();
    });
  });

  it('syncs an offline-created ticket with its project relation', async () => {
    const command = makeCreateCommand();
    const localTicket = makeLocalTicket({
      id: command.ticketId,
      isLocalOnly: true,
      baseUpdatedAt: null,
    });
    const created = makeTicketDto({
      id: 'server-ticket-1',
      projectId: 'project-1',
      projectName: 'Support',
      spaceId: 'space-1',
      spaceName: 'Ops',
    });

    mocks.queueRows.push(command);
    mocks.ticketRows.set(localTicket.id, localTicket);
    mocks.ticketsCreate.mockResolvedValue(created);
    mocks.ticketsDelete.mockImplementation(async (id: string) => {
      mocks.ticketRows.delete(id);
    });

    const result = await flushPendingCommands();

    expect(mocks.ticketsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        projectName: 'Support',
        spaceId: 'space-1',
        spaceName: 'Ops',
      }),
    );
    expect(mocks.ticketRows.has(command.ticketId)).toBe(false);
    expect(mocks.ticketRows.get(created.id)).toEqual(
      expect.objectContaining({
        projectId: 'project-1',
        projectName: 'Support',
        spaceId: 'space-1',
        spaceName: 'Ops',
        syncStatus: 'synced',
      }),
    );
    expect(mocks.queueRows).toEqual([]);
    expect(result).toEqual(
      expect.objectContaining({
        syncError: null,
        connectivityLost: false,
      }),
    );
  });

  it('keeps queued create data in an error state when project access is revoked', async () => {
    const command = makeCreateCommand();
    const localTicket = makeLocalTicket({
      id: command.ticketId,
      isLocalOnly: true,
      baseUpdatedAt: null,
    });

    mocks.queueRows.push(command);
    mocks.ticketRows.set(localTicket.id, localTicket);
    mocks.ticketsCreate.mockRejectedValue(forbiddenProjectError());

    const result = await flushPendingCommands();

    expect(mocks.ticketsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
      }),
    );
    expect(mocks.queueRows[0]).toEqual(
      expect.objectContaining({
        status: 'failed',
        payload: expect.objectContaining({
          projectId: 'project-1',
          projectName: 'Support',
          spaceId: 'space-1',
          spaceName: 'Ops',
        }),
        lastError: expect.stringContaining('Доступ к проекту'),
      }),
    );
    expect(mocks.ticketRows.get(command.ticketId)).toEqual(
      expect.objectContaining({
        projectId: 'project-1',
        projectName: 'Support',
        spaceId: 'space-1',
        spaceName: 'Ops',
        isLocalOnly: true,
        syncStatus: 'error',
        lastError: expect.stringContaining('Support'),
      }),
    );
    expect(result.syncError).toContain('Доступ к проекту');
  });

  it('keeps queued update data when the project ticket is no longer visible during sync', async () => {
    const command = makeUpdateCommand({
      payload: {
        projectId: 'project-2',
        projectName: 'Payments',
        spaceId: 'space-2',
        spaceName: 'Finance',
      },
    });
    const localTicket = makeLocalTicket({
      id: command.ticketId,
      projectId: 'project-2',
      projectName: 'Payments',
      spaceId: 'space-2',
      spaceName: 'Finance',
    });

    mocks.queueRows.push(command);
    mocks.ticketRows.set(localTicket.id, localTicket);
    mocks.ticketsList.mockResolvedValue([]);

    const result = await flushPendingCommands();

    expect(mocks.ticketsUpdate).not.toHaveBeenCalled();
    expect(mocks.queueRows[0]).toEqual(
      expect.objectContaining({
        status: 'failed',
        payload: expect.objectContaining({
          projectId: 'project-2',
          projectName: 'Payments',
          spaceId: 'space-2',
          spaceName: 'Finance',
        }),
        lastError: expect.stringContaining('Доступ к проекту'),
      }),
    );
    expect(mocks.ticketRows.get(command.ticketId)).toEqual(
      expect.objectContaining({
        projectId: 'project-2',
        projectName: 'Payments',
        spaceId: 'space-2',
        spaceName: 'Finance',
        syncStatus: 'error',
        lastError: expect.stringContaining('Payments'),
      }),
    );
    expect(result.syncError).toContain('Доступ к проекту');
  });
});
