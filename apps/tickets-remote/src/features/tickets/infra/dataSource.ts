import { ticketsApi } from '../api/ticketsApi';
import { sortCommands, type SyncCommand } from '../domain/commands';
import {
  hasPendingLocalState,
  nowIso,
  sortTickets,
  toLocalTicket,
  type LocalTicket,
  type TicketDto,
} from '../domain/models';
import { isNetworkLikeError } from './network';
import { ticketsDb, setMeta } from './dexie';

const MEMORY_TTL_MS = 15_000;

type MemoryCache = {
  expiresAt: number;
  items: LocalTicket[];
};

let memoryCache: MemoryCache | null = null;

export type DataSourceStrategy = 'network_first' | 'idb_first' | 'cache_first';
export type DataSourceReadSource = 'network' | 'idb' | 'memory';

function cloneTickets(items: LocalTicket[]) {
  return items.map((item) => ({ ...item }));
}

function setMemory(items: LocalTicket[]) {
  memoryCache = {
    expiresAt: Date.now() + MEMORY_TTL_MS,
    items: cloneTickets(sortTickets(items)),
  };
}

async function setReadDiagnostics(strategy: DataSourceStrategy, source: DataSourceReadSource) {
  await setMeta('lastReadStrategy', strategy);
  await setMeta('lastReadSource', source);
  await setMeta('lastReadAt', nowIso());
}

function mergeRemoteIntoLocal(remoteTickets: TicketDto[], localTickets: LocalTicket[]) {
  const localById = new Map(localTickets.map((ticket) => [ticket.id, ticket]));
  const merged: LocalTicket[] = [];

  for (const remoteTicket of remoteTickets) {
    const localTicket = localById.get(remoteTicket.id);

    if (localTicket && hasPendingLocalState(localTicket)) {
      merged.push(localTicket);
    } else {
      merged.push(toLocalTicket(remoteTicket));
    }

    localById.delete(remoteTicket.id);
  }

  for (const leftover of localById.values()) {
    if (hasPendingLocalState(leftover)) {
      merged.push(leftover);
    }
  }

  return sortTickets(merged);
}

export function resetTicketsMemoryCache() {
  memoryCache = null;
}

export async function readLocalState(): Promise<{ tickets: LocalTicket[]; queue: SyncCommand[] }> {
  return {
    tickets: sortTickets(await ticketsDb.tickets.toArray()),
    queue: sortCommands(await ticketsDb.queue.toArray()),
  };
}

export function readFromMemory(): LocalTicket[] | null {
  if (!memoryCache) {
    return null;
  }

  if (memoryCache.expiresAt <= Date.now()) {
    memoryCache = null;
    return null;
  }

  return sortTickets(cloneTickets(memoryCache.items));
}

export async function readFromIdb(): Promise<LocalTicket[]> {
  return sortTickets(await ticketsDb.tickets.toArray());
}

export async function refreshFromNetwork(): Promise<LocalTicket[]> {
  const localItems = await ticketsDb.tickets.toArray();
  const remoteItems = await ticketsApi.list();
  const merged = mergeRemoteIntoLocal(remoteItems, localItems);

  await ticketsDb.tickets.bulkPut(merged);
  setMemory(merged);

  return merged;
}

export async function loadTicketsByStrategy({
  strategy,
  online,
  accessToken,
}: {
  strategy: DataSourceStrategy;
  online: boolean;
  accessToken: string;
}): Promise<{
  items: LocalTicket[];
  source: DataSourceReadSource;
  lastSyncAt: string | null;
  networkUnavailable: boolean;
}> {
  if (strategy === 'cache_first') {
    const memoryItems = readFromMemory();
    if (memoryItems) {
      await setReadDiagnostics(strategy, 'memory');
      return {
        items: memoryItems,
        source: 'memory',
        lastSyncAt: null,
        networkUnavailable: false,
      };
    }

    if (online && accessToken) {
      try {
        const networkItems = await refreshFromNetwork();
        await setReadDiagnostics(strategy, 'network');
        return {
          items: networkItems,
          source: 'network',
          lastSyncAt: nowIso(),
          networkUnavailable: false,
        };
      } catch (error) {
        const idbItems = await readFromIdb();
        await setReadDiagnostics(strategy, 'idb');
        return {
          items: idbItems,
          source: 'idb',
          lastSyncAt: null,
          networkUnavailable: isNetworkLikeError(error),
        };
      }
    }

    const idbItems = await readFromIdb();
    await setReadDiagnostics(strategy, 'idb');
    return {
      items: idbItems,
      source: 'idb',
      lastSyncAt: null,
      networkUnavailable: false,
    };
  }

  if (strategy === 'idb_first') {
    const idbItems = await readFromIdb();

    if (idbItems.length > 0) {
      setMemory(idbItems);
      await setReadDiagnostics(strategy, 'idb');

      if (online && accessToken) {
        void refreshFromNetwork().catch(() => {});
      }

      return {
        items: idbItems,
        source: 'idb',
        lastSyncAt: null,
        networkUnavailable: false,
      };
    }

    if (online && accessToken) {
      const networkItems = await refreshFromNetwork();
      await setReadDiagnostics(strategy, 'network');
      return {
        items: networkItems,
        source: 'network',
        lastSyncAt: nowIso(),
        networkUnavailable: false,
      };
    }

    await setReadDiagnostics(strategy, 'idb');
    return {
      items: [],
      source: 'idb',
      lastSyncAt: null,
      networkUnavailable: false,
    };
  }

  try {
    if (!online || !accessToken) {
      throw new Error('Сеть недоступна');
    }

    const networkItems = await refreshFromNetwork();
    await setReadDiagnostics(strategy, 'network');
    return {
      items: networkItems,
      source: 'network',
      lastSyncAt: nowIso(),
      networkUnavailable: false,
    };
  } catch (error) {
    const idbItems = await readFromIdb();
    setMemory(idbItems);
    await setReadDiagnostics(strategy, 'idb');
    return {
      items: idbItems,
      source: 'idb',
      lastSyncAt: null,
      networkUnavailable: isNetworkLikeError(error),
    };
  }
}
