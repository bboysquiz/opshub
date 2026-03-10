import type { AnalyticsFilters, StatusFilter, TeamFilter } from '../domain/models';

const STORAGE_KEY = 'opshub.analytics.filters';
const QUERY_KEYS = {
  dateFrom: 'analyticsFrom',
  dateTo: 'analyticsTo',
  status: 'analyticsStatus',
  team: 'analyticsTeam',
} as const;

const VALID_STATUSES: StatusFilter[] = ['all', 'open', 'in_progress', 'resolved'];
const VALID_TEAMS: TeamFilter[] = ['all', 'support', 'operations', 'requesters', 'unassigned'];

function normalizeDate(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function normalizeStatus(value: unknown): StatusFilter {
  if (typeof value === 'string' && VALID_STATUSES.includes(value as StatusFilter)) {
    return value as StatusFilter;
  }

  return 'all';
}

function normalizeTeam(value: unknown): TeamFilter {
  if (typeof value === 'string' && VALID_TEAMS.includes(value as TeamFilter)) {
    return value as TeamFilter;
  }

  return 'all';
}

type RawAnalyticsFilters = Partial<
  Omit<AnalyticsFilters, 'status' | 'team'> & {
    status: string;
    team: string;
  }
>;

function normalizeFilters(
  value: RawAnalyticsFilters | null | undefined,
): Partial<AnalyticsFilters> {
  return {
    dateFrom: normalizeDate(value?.dateFrom),
    dateTo: normalizeDate(value?.dateTo),
    status: normalizeStatus(value?.status),
    team: normalizeTeam(value?.team),
  };
}

export function restoreAnalyticsFilters(): Partial<AnalyticsFilters> {
  if (typeof window === 'undefined') {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  const fromQuery = normalizeFilters({
    dateFrom: params.get(QUERY_KEYS.dateFrom) ?? undefined,
    dateTo: params.get(QUERY_KEYS.dateTo) ?? undefined,
    status: params.get(QUERY_KEYS.status) ?? undefined,
    team: params.get(QUERY_KEYS.team) ?? undefined,
  });

  const hasQueryFilters = Object.values(fromQuery).some((value) => value && value !== 'all');
  if (hasQueryFilters) {
    return fromQuery;
  }

  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return {};
  }

  try {
    return normalizeFilters(JSON.parse(stored) as Partial<AnalyticsFilters>);
  } catch {
    return {};
  }
}

export function persistAnalyticsFilters(filters: AnalyticsFilters) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = normalizeFilters(filters);
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

  const url = new URL(window.location.href);

  if (normalized.dateFrom) {
    url.searchParams.set(QUERY_KEYS.dateFrom, normalized.dateFrom);
  } else {
    url.searchParams.delete(QUERY_KEYS.dateFrom);
  }

  if (normalized.dateTo) {
    url.searchParams.set(QUERY_KEYS.dateTo, normalized.dateTo);
  } else {
    url.searchParams.delete(QUERY_KEYS.dateTo);
  }

  if (normalized.status && normalized.status !== 'all') {
    url.searchParams.set(QUERY_KEYS.status, normalized.status);
  } else {
    url.searchParams.delete(QUERY_KEYS.status);
  }

  if (normalized.team && normalized.team !== 'all') {
    url.searchParams.set(QUERY_KEYS.team, normalized.team);
  } else {
    url.searchParams.delete(QUERY_KEYS.team);
  }

  window.history.replaceState(window.history.state, '', url);
}
