import type { TeamKind, TicketPriority, TicketStatus } from '../domain/models';

export const statusLabels: Record<TicketStatus, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  resolved: 'Решён',
};

export const priorityLabels: Record<TicketPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

export const teamLabels: Record<TeamKind, string> = {
  support: 'Поддержка',
  operations: 'Операции',
  requesters: 'Сотрудники',
  unassigned: 'Без назначения',
};

export const teamColors: Record<TeamKind, string> = {
  support: 'primary',
  operations: 'secondary',
  requesters: 'warning',
  unassigned: 'grey-7',
};

export const statusColors: Record<TicketStatus, string> = {
  open: 'primary',
  in_progress: 'warning',
  resolved: 'positive',
};

export const priorityColors: Record<TicketPriority, string> = {
  low: 'grey-7',
  medium: 'orange',
  high: 'negative',
};

export function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatShortDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  }).format(parsed);
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) {
    return 'меньше минуты';
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (!hours) {
    return `${restMinutes} мин`;
  }

  if (!restMinutes) {
    return `${hours} ч`;
  }

  return `${hours} ч ${restMinutes} мин`;
}
