import type { AnalyticsTicketViewModel } from '../domain/models';
import { formatDateTime, formatDuration, priorityLabels, statusLabels, teamLabels } from './labels';

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function downloadAnalyticsCsv(rows: AnalyticsTicketViewModel[]) {
  const header = [
    'ID',
    'Заголовок',
    'Статус',
    'Роль исполнителя',
    'Приоритет',
    'Исполнитель',
    'Создан',
    'Обновлён',
    'Время реакции',
    'SLA',
  ];

  const lines = rows.map((row) => [
    row.id,
    row.title,
    statusLabels[row.status],
    teamLabels[row.assignedTeam],
    priorityLabels[row.priority],
    row.assignedToEmail ?? 'Не назначен',
    formatDateTime(row.createdAt),
    formatDateTime(row.updatedAt),
    formatDuration(row.responseMinutes),
    row.slaBreached ? 'Нарушение' : 'В SLA',
  ]);

  const csv = [header, ...lines]
    .map((columns) => columns.map((value) => escapeCsv(String(value))).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
