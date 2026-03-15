import { ticketsApi } from '../api/ticketsApi';
import { ticketsDb, setMeta } from './dexie';
import {
  loadTicketsByStrategy,
  readFromMemory,
  refreshFromNetwork,
  resetTicketsMemoryCache,
} from './dataSource';
import { toLocalTicket, type TicketDto } from '../domain/models';

vi.mock('../api/ticketsApi', () => ({
  ticketsApi: {
    list: vi.fn(),
  },
}));

vi.mock('./dexie', () => ({
  ticketsDb: {
    tickets: {
      toArray: vi.fn(),
      bulkPut: vi.fn(),
    },
    queue: {
      toArray: vi.fn(),
    },
  },
  setMeta: vi.fn(),
}));

function createTicket(overrides: Partial<TicketDto> = {}): TicketDto {
  return {
    id: 'ticket-1',
    title: 'Серверный тикет',
    description: 'Описание',
    status: 'open',
    priority: 'medium',
    createdBy: 'user-1',
    createdByEmail: 'creator@example.com',
    assignedTo: 'agent-1',
    assignedToEmail: 'agent@example.com',
    updatedAt: '2025-01-01T10:00:00.000Z',
    createdAt: '2025-01-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('tickets dataSource', () => {
  beforeEach(() => {
    resetTicketsMemoryCache();
    vi.mocked(ticketsDb.tickets.toArray).mockReset();
    vi.mocked(ticketsDb.tickets.bulkPut).mockReset();
    vi.mocked(ticketsApi.list).mockReset();
    vi.mocked(setMeta).mockReset();
  });

  it('keeps local pending changes when refreshing from the network', async () => {
    vi.mocked(ticketsDb.tickets.toArray).mockResolvedValue([
      toLocalTicket(createTicket(), {
        title: 'Локальный черновик',
        syncStatus: 'queued',
        isLocalOnly: true,
      }),
    ]);
    vi.mocked(ticketsApi.list).mockResolvedValue([
      createTicket(),
      createTicket({
        id: 'ticket-2',
        title: 'Новый серверный тикет',
        createdAt: '2025-01-02T09:00:00.000Z',
      }),
    ]);

    const items = await refreshFromNetwork();

    expect(items).toHaveLength(2);
    expect(items.find((item) => item.id === 'ticket-1')?.title).toBe('Локальный черновик');
    expect(vi.mocked(ticketsDb.tickets.bulkPut)).toHaveBeenCalledWith(items);
    expect(readFromMemory()?.map((item) => item.id)).toEqual(['ticket-2', 'ticket-1']);
  });

  it('falls back to indexeddb for network_first when the request fails', async () => {
    const localItem = toLocalTicket(createTicket());
    vi.mocked(ticketsDb.tickets.toArray).mockResolvedValue([localItem]);
    vi.mocked(ticketsApi.list).mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await loadTicketsByStrategy({
      strategy: 'network_first',
      online: true,
      accessToken: 'token',
    });

    expect(result.source).toBe('idb');
    expect(result.networkUnavailable).toBe(true);
    expect(result.items).toEqual([localItem]);
    expect(setMeta).toHaveBeenCalledWith('lastReadSource', 'idb');
  });
});
