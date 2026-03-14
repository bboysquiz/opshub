import {
  logTicketAssignedActivity,
  logTicketCreatedActivity,
  logTicketDeletedActivity,
  logTicketStatusChangedActivity,
  logTicketUpdatedActivity,
} from '../activity/service';
import type { AccessPayload } from '../auth/types';
import {
  notifyTicketAssigned,
  notifyTicketDeleted,
  notifyTicketStatusChanged,
  notifyTicketUpdated,
} from '../push/service';
import {
  createTicket,
  deleteTicketById,
  getTicketById,
  listTickets,
  updateTicketById,
} from './repository';
import { TicketsError } from './errors';
import type {
  CreateTicketInput,
  TicketDto,
  TicketRow,
  TicketStatus,
  UpdateTicketInput,
} from './types';

const ticketStatusLabels: Record<TicketStatus, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  resolved: 'Решён',
};

function mapTicket(row: TicketRow): TicketDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    assignedTo: row.assigned_to,
    assignedToEmail: row.assigned_to_email,
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
  actor: AccessPayload,
  payload: CreateTicketInput,
): Promise<TicketDto> {
  try {
    const row = await createTicket({ ...payload, createdBy: actor.sub });
    await logTicketCreatedActivity({
      actorId: actor.sub,
      actorEmail: actor.email,
      ticketId: row.id,
      ticketTitle: row.title,
    }).catch((error) => {
      console.error('Failed to write ticket_created activity event', error);
    });

    if (row.assigned_to) {
      void notifyTicketAssigned({
        actorId: actor.sub,
        creatorId: row.created_by,
        userId: row.assigned_to,
        title: row.title,
        ticketId: row.id,
      });

      await logTicketAssignedActivity({
        actorId: actor.sub,
        actorEmail: actor.email,
        ticketId: row.id,
        ticketTitle: row.title,
        assigneeEmail: row.assigned_to_email,
      }).catch((error) => {
        console.error('Failed to write ticket_assigned activity event', error);
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

function canUpdateTicket(actor: AccessPayload, ticket: TicketRow): boolean {
  if (actor.role === 'admin' || actor.role === 'agent') {
    return true;
  }

  return ticket.created_by === actor.sub;
}

function canDeleteTicket(actor: AccessPayload, ticket: TicketRow): boolean {
  if (actor.role === 'admin') {
    return true;
  }

  return ticket.created_by === actor.sub;
}

export async function updateTicketRecord(
  id: string,
  patch: UpdateTicketInput,
  actor: AccessPayload,
): Promise<TicketDto> {
  try {
    const previous = await getTicketById(id);
    if (!previous) {
      throw new TicketsError(404, 'Ticket not found');
    }

    if (!canUpdateTicket(actor, previous)) {
      throw new TicketsError(403, 'Forbidden');
    }

    if (actor.role === 'employee' && patch.assignedTo !== undefined) {
      throw new TicketsError(403, 'Forbidden');
    }

    const row = await updateTicketById(id, patch);
    if (!row) {
      throw new TicketsError(404, 'Ticket not found');
    }

    if (patch.status !== undefined && patch.status !== previous.status) {
      await logTicketStatusChangedActivity({
        actorId: actor.sub,
        actorEmail: actor.email,
        ticketId: row.id,
        ticketTitle: row.title,
        statusLabel: ticketStatusLabels[row.status],
      }).catch((error) => {
        console.error('Failed to write ticket_status_changed activity event', error);
      });

      void notifyTicketStatusChanged({
        actorId: actor.sub,
        creatorId: row.created_by,
        assigneeId: row.assigned_to,
        previousAssigneeId: previous.assigned_to,
        title: row.title,
        ticketId: row.id,
        statusLabel: ticketStatusLabels[row.status],
      });
    } else if (row.assigned_to && row.assigned_to !== previous.assigned_to) {
      await logTicketAssignedActivity({
        actorId: actor.sub,
        actorEmail: actor.email,
        ticketId: row.id,
        ticketTitle: row.title,
        assigneeEmail: row.assigned_to_email,
      }).catch((error) => {
        console.error('Failed to write ticket_assigned activity event', error);
      });

      void notifyTicketAssigned({
        actorId: actor.sub,
        creatorId: row.created_by,
        userId: row.assigned_to,
        title: row.title,
        ticketId: row.id,
      });
    } else {
      await logTicketUpdatedActivity({
        actorId: actor.sub,
        actorEmail: actor.email,
        ticketId: row.id,
        ticketTitle: row.title,
      }).catch((error) => {
        console.error('Failed to write ticket_updated activity event', error);
      });

      void notifyTicketUpdated({
        actorId: actor.sub,
        creatorId: row.created_by,
        assigneeId: row.assigned_to,
        previousAssigneeId: previous.assigned_to,
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

export async function deleteTicketRecord(id: string, actor: AccessPayload): Promise<void> {
  const existing = await getTicketById(id);
  if (!existing) {
    throw new TicketsError(404, 'Ticket not found');
  }

  if (!canDeleteTicket(actor, existing)) {
    throw new TicketsError(403, 'Forbidden');
  }

  const deleted = await deleteTicketById(id);
  if (!deleted) {
    throw new TicketsError(404, 'Ticket not found');
  }

  await logTicketDeletedActivity({
    actorId: actor.sub,
    actorEmail: actor.email,
    ticketId: existing.id,
    ticketTitle: existing.title,
  }).catch((error) => {
    console.error('Failed to write ticket_deleted activity event', error);
  });

  void notifyTicketDeleted({
    actorId: actor.sub,
    creatorId: existing.created_by,
    assigneeId: existing.assigned_to,
    title: existing.title,
    ticketId: existing.id,
  });
}
