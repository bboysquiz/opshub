import type { Role } from '../auth/types';
import { listAnalyticsTickets } from './repository';
import type { AnalyticsTeam, AnalyticsTicketDto, AnalyticsTicketRow } from './types';

function mapRoleToTeam(role: Role | null, hasAssignee: boolean): AnalyticsTeam {
  if (!hasAssignee) {
    return 'unassigned';
  }

  if (role === 'admin') {
    return 'operations';
  }

  if (role === 'agent') {
    return 'support';
  }

  return 'requesters';
}

function mapTicket(row: AnalyticsTicketRow): AnalyticsTicketDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    createdByRole: row.created_by_role,
    assignedTo: row.assigned_to,
    assignedToEmail: row.assigned_to_email,
    assignedToRole: row.assigned_to_role,
    // В текущей модели нет отдельного поля команды, поэтому для аналитики
    // используем роль исполнителя как прокси-измерение команды.
    assignedTeam: mapRoleToTeam(row.assigned_to_role, Boolean(row.assigned_to)),
  };
}

export async function getAnalyticsTickets(): Promise<AnalyticsTicketDto[]> {
  const rows = await listAnalyticsTickets();
  return rows.map(mapTicket);
}
