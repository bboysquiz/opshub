import { computed, type Ref } from 'vue';
import type {
  AnalyticsBucket,
  AnalyticsFilters,
  AnalyticsSnapshot,
  AnalyticsTicket,
  AnalyticsTicketViewModel,
  TeamKind,
  TicketPriority,
} from '../domain/models';
import { formatShortDate, statusLabels, teamLabels } from '../utils/labels';

const SLA_TARGET_MINUTES: Record<TicketPriority, number> = {
  low: 24 * 60,
  medium: 8 * 60,
  high: 4 * 60,
};

const STATUS_ORDER = ['open', 'in_progress', 'resolved'] as const;
const TEAM_ORDER: TeamKind[] = ['support', 'operations', 'requesters', 'unassigned'];

function toTimestamp(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function toStartOfDay(value: string) {
  return value ? new Date(`${value}T00:00:00`).getTime() : null;
}

function toEndOfDay(value: string) {
  return value ? new Date(`${value}T23:59:59.999`).getTime() : null;
}

function computeResponseMinutes(ticket: AnalyticsTicket, now: number) {
  const createdAt = toTimestamp(ticket.createdAt);
  const updatedAt =
    ticket.status === 'resolved' ? toTimestamp(ticket.updatedAt) : Math.max(now, createdAt);

  if (!createdAt || !updatedAt) {
    return 0;
  }

  return Math.max(0, Math.round((updatedAt - createdAt) / 60000));
}

function matchesFilters(ticket: AnalyticsTicket, filters: AnalyticsFilters) {
  const createdAt = toTimestamp(ticket.createdAt);
  const from = toStartOfDay(filters.dateFrom);
  const to = toEndOfDay(filters.dateTo);

  if (filters.status !== 'all' && ticket.status !== filters.status) {
    return false;
  }

  if (filters.team !== 'all' && ticket.assignedTeam !== filters.team) {
    return false;
  }

  if (from !== null && createdAt < from) {
    return false;
  }

  if (to !== null && createdAt > to) {
    return false;
  }

  return true;
}

function groupByStatus(rows: AnalyticsTicketViewModel[]): AnalyticsBucket[] {
  const counts = new Map<string, number>();

  STATUS_ORDER.forEach((status) => {
    counts.set(status, 0);
  });

  rows.forEach((row) => {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  });

  return STATUS_ORDER.map((status) => ({
    key: status,
    label: statusLabels[status],
    count: counts.get(status) ?? 0,
  }));
}

function groupByTeam(rows: AnalyticsTicketViewModel[]): AnalyticsBucket[] {
  const counts = new Map<TeamKind, number>();

  TEAM_ORDER.forEach((team) => {
    counts.set(team, 0);
  });

  rows.forEach((row) => {
    counts.set(row.assignedTeam, (counts.get(row.assignedTeam) ?? 0) + 1);
  });

  return TEAM_ORDER.map((team) => ({
    key: team,
    label: teamLabels[team],
    count: counts.get(team) ?? 0,
  }));
}

function groupByTimeline(rows: AnalyticsTicketViewModel[]): AnalyticsBucket[] {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const day = row.createdAt.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, count]) => ({
      key: day,
      label: formatShortDate(day),
      count,
    }));
}

function groupBySla(rows: AnalyticsTicketViewModel[]): AnalyticsBucket[] {
  const withinTarget = rows.filter((row) => !row.slaBreached).length;
  const breached = rows.length - withinTarget;

  return [
    { key: 'within_target', label: 'В SLA', count: withinTarget },
    { key: 'breached', label: 'Нарушение SLA', count: breached },
  ];
}

function buildTableRows(
  tickets: AnalyticsTicket[],
  filters: AnalyticsFilters,
): AnalyticsTicketViewModel[] {
  const now = Date.now();

  return tickets
    .filter((ticket) => matchesFilters(ticket, filters))
    .map((ticket) => {
      const responseMinutes = computeResponseMinutes(ticket, now);
      const slaTargetMinutes = SLA_TARGET_MINUTES[ticket.priority];

      return {
        ...ticket,
        responseMinutes,
        slaTargetMinutes,
        slaBreached: responseMinutes > slaTargetMinutes,
      };
    })
    .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
}

function buildSnapshot(tickets: AnalyticsTicket[], filters: AnalyticsFilters): AnalyticsSnapshot {
  const tableRows = buildTableRows(tickets, filters);
  const resolvedCount = tableRows.filter((row) => row.status === 'resolved').length;
  const activeCount = tableRows.filter((row) => row.status !== 'resolved').length;
  const breachedCount = tableRows.filter((row) => row.slaBreached).length;
  const totalResponse = tableRows.reduce((sum, row) => sum + row.responseMinutes, 0);

  return {
    totalCount: tableRows.length,
    activeCount,
    resolvedSharePercent: tableRows.length
      ? Math.round((resolvedCount / tableRows.length) * 100)
      : 0,
    avgResponseMinutes: tableRows.length ? Math.round(totalResponse / tableRows.length) : 0,
    breachedCount,
    byStatus: groupByStatus(tableRows),
    byTimeline: groupByTimeline(tableRows),
    bySla: groupBySla(tableRows),
    byTeam: groupByTeam(tableRows),
    tableRows,
  };
}

function buildMemoKey(tickets: AnalyticsTicket[], filters: AnalyticsFilters) {
  const ticketSignature = tickets
    .map((ticket) =>
      [
        ticket.id,
        ticket.status,
        ticket.priority,
        ticket.assignedTeam,
        ticket.createdAt,
        ticket.updatedAt,
      ].join(':'),
    )
    .join('|');

  return JSON.stringify(filters) + '|' + ticketSignature;
}

export function useMemoizedAnalytics(
  tickets: Ref<AnalyticsTicket[]>,
  filters: Ref<AnalyticsFilters>,
) {
  const cache = new Map<string, AnalyticsSnapshot>();

  const snapshot = computed(() => {
    const key = buildMemoKey(tickets.value, filters.value);
    const cached = cache.get(key);

    if (cached) {
      return cached;
    }

    const next = buildSnapshot(tickets.value, filters.value);
    cache.set(key, next);

    if (cache.size > 30) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }

    return next;
  });

  return {
    snapshot,
  };
}
