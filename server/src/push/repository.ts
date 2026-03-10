import type { PoolClient } from 'pg';
import { pool } from '../db';
import type { Role } from '../auth/types';
import type { DeliveryTarget, PushSubscriptionInput, PushSubscriptionRow } from './types';

type Queryable = Pick<PoolClient, 'query'>;

const SUBSCRIPTION_COLUMNS = `
  id,
  user_id,
  endpoint,
  p256dh,
  auth,
  created_at
`;

const ALIASED_SUBSCRIPTION_COLUMNS = `
  ps.id,
  ps.user_id,
  ps.endpoint,
  ps.p256dh,
  ps.auth,
  ps.created_at
`;

export async function countSubscriptionsByUserId(
  userId: string,
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query<{ count: string }>(
    'select count(*)::text as count from push_subscriptions where user_id = $1',
    [userId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function replacePushSubscription(
  userId: string,
  subscription: PushSubscriptionInput,
  db: Queryable = pool,
): Promise<PushSubscriptionRow> {
  await db.query('delete from push_subscriptions where endpoint = $1', [subscription.endpoint]);

  const result = await db.query<PushSubscriptionRow>(
    `insert into push_subscriptions (user_id, endpoint, p256dh, auth)
     values ($1, $2, $3, $4)
     returning ${SUBSCRIPTION_COLUMNS}`,
    [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth],
  );

  return result.rows[0];
}

export async function deletePushSubscription(
  userId: string,
  endpoint: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    'delete from push_subscriptions where user_id = $1 and endpoint = $2',
    [userId, endpoint],
  );

  return Boolean(result.rowCount);
}

export async function deletePushSubscriptionByEndpoint(
  endpoint: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query('delete from push_subscriptions where endpoint = $1', [endpoint]);
  return Boolean(result.rowCount);
}

export async function listDeliveryTargetsByUserIds(
  userIds: string[],
  db: Queryable = pool,
): Promise<DeliveryTarget[]> {
  if (!userIds.length) {
    return [];
  }

  const result = await db.query<DeliveryTarget>(
    `select
       ${ALIASED_SUBSCRIPTION_COLUMNS},
       u.email,
       u.role
     from push_subscriptions ps
     join users u on u.id = ps.user_id
     where ps.user_id = any($1::uuid[])`,
    [userIds],
  );

  return result.rows;
}

export async function listDeliveryTargetsByRoles(
  roles: Role[],
  db: Queryable = pool,
): Promise<DeliveryTarget[]> {
  if (!roles.length) {
    return [];
  }

  const result = await db.query<DeliveryTarget>(
    `select
       ${ALIASED_SUBSCRIPTION_COLUMNS},
       u.email,
       u.role
     from push_subscriptions ps
     join users u on u.id = ps.user_id
     where u.role = any($1::text[])`,
    [roles],
  );

  return result.rows;
}
