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
  findFirstProjectIdForActor,
  getTicketByIdForActor,
  isProjectMember,
  listTicketsForActor,
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
    projectId: row.project_id,
    projectName: row.project_name,
    spaceId: row.space_id,
    spaceName: row.space_name,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    assignedTo: row.assigned_to,
    assignedToEmail: row.assigned_to_email,
    dueAt: row.due_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function isFkViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23503';
}

export async function getTickets(actor: AccessPayload): Promise<TicketDto[]> {
  const rows = await listTicketsForActor(actor.sub);
  return rows.map(mapTicket);
}

async function resolveTicketProjectId(actor: AccessPayload, projectId?: string): Promise<string> {
  if (projectId) {
    if (!(await isProjectMember(projectId, actor.sub))) {
      throw new TicketsError(403, 'Forbidden project');
    }

    return projectId;
  }

  const fallbackProjectId = await findFirstProjectIdForActor(actor.sub);
  if (!fallbackProjectId) {
    throw new TicketsError(400, 'Project is required');
  }

  return fallbackProjectId;
}

async function assertProjectMember(
  projectId: string,
  userId: string,
  message: string,
): Promise<void> {
  if (await isProjectMember(projectId, userId)) {
    return;
  }

  throw new TicketsError(400, message);
}

export async function createTicketRecord(
  actor: AccessPayload,
  payload: CreateTicketInput,
): Promise<TicketDto> {
  try {
    const projectId = await resolveTicketProjectId(actor, payload.projectId);
    if (payload.assignedTo) {
      await assertProjectMember(projectId, payload.assignedTo, 'Invalid assignedTo project member');
    }

    const row = await createTicket({ ...payload, projectId, createdBy: actor.sub });
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
    const previous = await getTicketByIdForActor(id, actor.sub);
    if (!previous) {
      throw new TicketsError(404, 'Ticket not found');
    }

    if (!canUpdateTicket(actor, previous)) {
      throw new TicketsError(403, 'Forbidden');
    }

    if (actor.role === 'employee' && patch.assignedTo !== undefined) {
      throw new TicketsError(403, 'Forbidden');
    }

    const nextProjectId = patch.projectId ?? previous.project_id;
    if (patch.projectId !== undefined && !(await isProjectMember(patch.projectId, actor.sub))) {
      throw new TicketsError(403, 'Forbidden project');
    }

    const nextAssigneeId = patch.assignedTo !== undefined ? patch.assignedTo : previous.assigned_to;
    if (nextAssigneeId) {
      await assertProjectMember(nextProjectId, nextAssigneeId, 'Invalid assignedTo project member');
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
  const existing = await getTicketByIdForActor(id, actor.sub);
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
