export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high';
export type LocalSyncStatus = 'synced' | 'queued' | 'syncing' | 'error' | 'conflict';

export type TicketDto = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string | null;
  assignedTo: string | null;
  updatedAt: string;
  createdAt: string;
};

export type CreateTicketInput = {
  title: string;
  description: string;
  priority: TicketPriority;
};

export type UpdateTicketInput = {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
};

export type LocalTicket = TicketDto & {
  syncStatus: LocalSyncStatus;
  isLocalOnly: boolean;
  isDeleted: boolean;
  baseUpdatedAt: string | null;
  lastError: string | null;
  conflict: boolean;
};

export function nowIso() {
  return new Date().toISOString();
}

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Неожиданная ошибка';
}

export function sortTickets(items: LocalTicket[]) {
  return [...items].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function toLocalTicket(
  ticket: TicketDto,
  overrides: Partial<LocalTicket> = {},
): LocalTicket {
  return {
    ...ticket,
    updatedAt: String(ticket.updatedAt),
    createdAt: String(ticket.createdAt),
    syncStatus: 'synced',
    isLocalOnly: false,
    isDeleted: false,
    baseUpdatedAt: String(ticket.updatedAt),
    lastError: null,
    conflict: false,
    ...overrides,
  };
}

export function hasPendingLocalState(ticket: LocalTicket) {
  return ticket.isLocalOnly || ticket.isDeleted || ticket.syncStatus !== 'synced';
}
