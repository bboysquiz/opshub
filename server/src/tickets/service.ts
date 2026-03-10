import { notifyTicketAssigned } from '../push/service';
import {
  createTicket,
  deleteTicketById,
  getTicketById,
  listTickets,
  updateTicketById,
} from './repository';
import { TicketsError } from './errors';
import type { CreateTicketInput, TicketDto, TicketRow, UpdateTicketInput } from './types';

function mapTicket(row: TicketRow): TicketDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function isFkViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23503';
}

export async function getTickets(): Promise<TicketDto[]> {
  const rows = await listTickets();
  return rows.map(mapTicket);
}

export async function createTicketRecord(
  createdBy: string,
  payload: CreateTicketInput,
): Promise<TicketDto> {
  try {
    const row = await createTicket({ ...payload, createdBy });
    if (row.assigned_to) {
      void notifyTicketAssigned({
        userId: row.assigned_to,
        title: row.title,
        ticketId: row.id,
      });
    }

    return mapTicket(row);
  } catch (err) {
    if (isFkViolation(err)) {
      throw new TicketsError(400, 'Invalid assignedTo user');
    }
    throw err;
  }
}

export async function updateTicketRecord(id: string, patch: UpdateTicketInput): Promise<TicketDto> {
  try {
    const previous = await getTicketById(id);
    if (!previous) {
      throw new TicketsError(404, 'Ticket not found');
    }

    const row = await updateTicketById(id, patch);
    if (!row) {
      throw new TicketsError(404, 'Ticket not found');
    }

    if (row.assigned_to && row.assigned_to !== previous.assigned_to) {
      void notifyTicketAssigned({
        userId: row.assigned_to,
        title: row.title,
        ticketId: row.id,
      });
    }

    return mapTicket(row);
  } catch (err) {
    if (isFkViolation(err)) {
      throw new TicketsError(400, 'Invalid assignedTo user');
    }
    throw err;
  }
}

export async function deleteTicketRecord(id: string): Promise<void> {
  const deleted = await deleteTicketById(id);
  if (!deleted) {
    throw new TicketsError(404, 'Ticket not found');
  }
}
