import type { Role } from '../auth/types';
import type { SlaSettingsDto } from '../sla/types';
import type { TicketPriority, TicketStatus } from '../tickets/types';

export type AnalyticsTeam = 'operations' | 'support' | 'requesters' | 'unassigned';

export type AnalyticsTicketRow = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string | null;
  created_by_email: string | null;
  created_by_role: Role | null;
  assigned_to: string | null;
  assigned_to_email: string | null;
  assigned_to_role: Role | null;
};

export type AnalyticsTicketDto = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string | null;
  createdByEmail: string | null;
  createdByRole: Role | null;
  assignedTo: string | null;
  assignedToEmail: string | null;
  assignedToRole: Role | null;
  assignedTeam: AnalyticsTeam;
};

export type AnalyticsPayloadDto = {
  items: AnalyticsTicketDto[];
  slaSettings: SlaSettingsDto;
};
