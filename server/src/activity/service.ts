import { createActivityEvent, listActivityEvents } from './repository';
import type {
  ActivityEventDto,
  ActivityEventKind,
  ActivityEventRow,
  ActivityFeedCursor,
  ActivityFeedPageDto,
} from './types';

function mapActivityEvent(row: ActivityEventRow): ActivityEventDto {
  return {
    id: row.id,
    actorEmail: row.actor_email,
    kind: row.kind,
    title: row.title,
    description: row.description,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    resourcePath: row.resource_path,
    createdAt: row.created_at,
  };
}

async function writeActivityEvent(args: {
  actorId: string | null;
  actorEmail: string;
  kind: ActivityEventKind;
  title: string;
  description: string;
  resourceType: string;
  resourceId: string | null;
  resourcePath: string;
}) {
  const row = await createActivityEvent(args);
  return mapActivityEvent(row);
}

export async function listRecentActivityPage(
  args: {
    limit?: number;
    cursor?: ActivityFeedCursor | null;
  } = {},
): Promise<ActivityFeedPageDto> {
  const pageLimit = Number.isFinite(args.limit)
    ? Math.max(1, Math.min(50, Math.trunc(args.limit ?? 20)))
    : 20;
  const rows = await listActivityEvents({
    limit: pageLimit + 1,
    cursor: args.cursor ?? null,
  });
  const hasMore = rows.length > pageLimit;
  const pageRows = hasMore ? rows.slice(0, pageLimit) : rows;
  const lastRow = pageRows.length > 0 ? pageRows[pageRows.length - 1] : null;

  return {
    items: pageRows.map(mapActivityEvent),
    nextCursor: hasMore && lastRow ? { createdAt: lastRow.created_at, id: lastRow.id } : null,
    hasMore,
  };
}

export async function logTicketCreatedActivity(args: {
  actorId: string;
  actorEmail: string;
  ticketId: string;
  ticketTitle: string;
}) {
  return writeActivityEvent({
    actorId: args.actorId,
    actorEmail: args.actorEmail,
    kind: 'ticket_created',
    title: `Создан тикет «${args.ticketTitle}»`,
    description: `${args.actorEmail} создал новый тикет.`,
    resourceType: 'ticket',
    resourceId: args.ticketId,
    resourcePath: '/tickets',
  });
}

export async function logTicketStatusChangedActivity(args: {
  actorId: string;
  actorEmail: string;
  ticketId: string;
  ticketTitle: string;
  statusLabel: string;
}) {
  return writeActivityEvent({
    actorId: args.actorId,
    actorEmail: args.actorEmail,
    kind: 'ticket_status_changed',
    title: `Изменён статус тикета «${args.ticketTitle}»`,
    description: `${args.actorEmail} перевёл тикет в статус «${args.statusLabel}».`,
    resourceType: 'ticket',
    resourceId: args.ticketId,
    resourcePath: '/tickets',
  });
}

export async function logTicketAssignedActivity(args: {
  actorId: string;
  actorEmail: string;
  ticketId: string;
  ticketTitle: string;
  assigneeEmail: string | null;
}) {
  const assigneeText = args.assigneeEmail ? `исполнителю ${args.assigneeEmail}` : 'исполнителю';

  return writeActivityEvent({
    actorId: args.actorId,
    actorEmail: args.actorEmail,
    kind: 'ticket_assigned',
    title: `Назначен исполнитель для тикета «${args.ticketTitle}»`,
    description: `${args.actorEmail} назначил тикет ${assigneeText}.`,
    resourceType: 'ticket',
    resourceId: args.ticketId,
    resourcePath: '/tickets',
  });
}

export async function logTicketUpdatedActivity(args: {
  actorId: string;
  actorEmail: string;
  ticketId: string;
  ticketTitle: string;
}) {
  return writeActivityEvent({
    actorId: args.actorId,
    actorEmail: args.actorEmail,
    kind: 'ticket_updated',
    title: `Обновлён тикет «${args.ticketTitle}»`,
    description: `${args.actorEmail} изменил данные тикета.`,
    resourceType: 'ticket',
    resourceId: args.ticketId,
    resourcePath: '/tickets',
  });
}

export async function logTicketDeletedActivity(args: {
  actorId: string;
  actorEmail: string;
  ticketId: string;
  ticketTitle: string;
}) {
  return writeActivityEvent({
    actorId: args.actorId,
    actorEmail: args.actorEmail,
    kind: 'ticket_deleted',
    title: `Удалён тикет «${args.ticketTitle}»`,
    description: `${args.actorEmail} удалил тикет.`,
    resourceType: 'ticket',
    resourceId: args.ticketId,
    resourcePath: '/tickets',
  });
}

export async function logKbArticleCreatedActivity(args: {
  actorId: string;
  actorEmail: string;
  articleId: string;
  articleTitle: string;
}) {
  return writeActivityEvent({
    actorId: args.actorId,
    actorEmail: args.actorEmail,
    kind: 'kb_article_created',
    title: `Создана статья «${args.articleTitle}»`,
    description: `${args.actorEmail} добавил статью в базу знаний.`,
    resourceType: 'kb_article',
    resourceId: args.articleId,
    resourcePath: '/kb',
  });
}

export async function logKbArticleUpdatedActivity(args: {
  actorId: string;
  actorEmail: string;
  articleId: string;
  articleTitle: string;
}) {
  return writeActivityEvent({
    actorId: args.actorId,
    actorEmail: args.actorEmail,
    kind: 'kb_article_updated',
    title: `Обновлена статья «${args.articleTitle}»`,
    description: `${args.actorEmail} обновил материал базы знаний.`,
    resourceType: 'kb_article',
    resourceId: args.articleId,
    resourcePath: '/kb',
  });
}

export async function logKbArticleDeletedActivity(args: {
  actorId: string;
  actorEmail: string;
  articleId: string;
  articleTitle: string;
}) {
  return writeActivityEvent({
    actorId: args.actorId,
    actorEmail: args.actorEmail,
    kind: 'kb_article_deleted',
    title: `Удалена статья «${args.articleTitle}»`,
    description: `${args.actorEmail} удалил материал из базы знаний.`,
    resourceType: 'kb_article',
    resourceId: args.articleId,
    resourcePath: '/kb',
  });
}
