export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TeamKind = 'operations' | 'support' | 'requesters' | 'unassigned';
export type TeamFilter = TeamKind | 'all';
export type StatusFilter = TicketStatus | 'all';

export type AnalyticsTicket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  createdByEmail: string | null;
  createdByRole: 'admin' | 'agent' | 'employee' | null;
  assignedTo: string | null;
  assignedToEmail: string | null;
  assignedToRole: 'admin' | 'agent' | 'employee' | null;
  assignedTeam: TeamKind;
};

export type AnalyticsTicketViewModel = AnalyticsTicket & {
  responseMinutes: number;
  slaTargetMinutes: number;
  slaBreached: boolean;
};

export type SlaSettings = {
  lowMinutes: number;
  mediumMinutes: number;
  highMinutes: number;
  updatedAt: string;
};

export const defaultSlaSettings: SlaSettings = {
  lowMinutes: 24 * 60,
  mediumMinutes: 8 * 60,
  highMinutes: 4 * 60,
  updatedAt: '',
};

export type AnalyticsFilters = {
  dateFrom: string;
  dateTo: string;
  status: StatusFilter;
  team: TeamFilter;
};

export type AnalyticsBucket = {
  key: string;
  label: string;
  count: number;
};

export type AnalyticsSnapshot = {
  totalCount: number;
  activeCount: number;
  resolvedSharePercent: number;
  avgResponseMinutes: number;
  breachedCount: number;
  byStatus: AnalyticsBucket[];
  byTimeline: AnalyticsBucket[];
  bySla: AnalyticsBucket[];
  byTeam: AnalyticsBucket[];
  tableRows: AnalyticsTicketViewModel[];
};
