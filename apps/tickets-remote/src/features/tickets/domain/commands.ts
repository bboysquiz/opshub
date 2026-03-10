import type { CreateTicketInput, UpdateTicketInput } from './models';

export type QueueStatus = 'pending' | 'processing' | 'failed' | 'conflict';

type BaseCommand = {
  id: string;
  ticketId: string;
  createdAt: string;
  updatedAt: string;
  tries: number;
  status: QueueStatus;
  lastError: string | null;
  baseUpdatedAt: string | null;
};

export type CreateTicketCommand = BaseCommand & {
  type: 'create';
  payload: CreateTicketInput;
};

export type UpdateTicketCommand = BaseCommand & {
  type: 'update';
  payload: UpdateTicketInput;
};

export type DeleteTicketCommand = BaseCommand & {
  type: 'delete';
  payload: null;
};

export type SyncCommand = CreateTicketCommand | UpdateTicketCommand | DeleteTicketCommand;

export function sortCommands(items: SyncCommand[]) {
  return [...items].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function mergeCreatePayload(
  current: CreateTicketInput,
  patch: UpdateTicketInput,
): CreateTicketInput {
  return {
    title: patch.title ?? current.title,
    description: patch.description ?? current.description,
    priority: patch.priority ?? current.priority,
  };
}
