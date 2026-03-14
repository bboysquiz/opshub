export type ActivityEventKind =
  | 'ticket_created'
  | 'ticket_status_changed'
  | 'ticket_assigned'
  | 'ticket_updated'
  | 'ticket_deleted'
  | 'kb_article_created'
  | 'kb_article_updated'
  | 'kb_article_deleted';

export type ActivityEventRow = {
  id: string;
  actor_id: string | null;
  actor_email: string;
  kind: ActivityEventKind;
  title: string;
  description: string;
  resource_type: string;
  resource_id: string | null;
  resource_path: string;
  created_at: string;
};

export type CreateActivityEventInput = {
  actorId: string | null;
  actorEmail: string;
  kind: ActivityEventKind;
  title: string;
  description: string;
  resourceType: string;
  resourceId: string | null;
  resourcePath: string;
};

export type ActivityEventDto = {
  id: string;
  actorEmail: string;
  kind: ActivityEventKind;
  title: string;
  description: string;
  resourceType: string;
  resourceId: string | null;
  resourcePath: string;
  createdAt: string;
};

export type ActivityFeedCursor = {
  createdAt: string;
  id: string;
};

export type ActivityFeedPageDto = {
  items: ActivityEventDto[];
  nextCursor: ActivityFeedCursor | null;
  hasMore: boolean;
};
