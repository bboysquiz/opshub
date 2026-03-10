import webpush from 'web-push';
import type { Role } from '../auth/types';
import { PushError } from './errors';
import {
  countSubscriptionsByUserId,
  deletePushSubscription,
  deletePushSubscriptionByEndpoint,
  listDeliveryTargetsByRoles,
  listDeliveryTargetsByUserIds,
  replacePushSubscription,
} from './repository';
import type {
  DeliveryTarget,
  PushAudience,
  PushMessagePayload,
  PushSendResult,
  PushSubscriptionInput,
} from './types';
import { env } from '../config/env';

const DEV_VAPID_PUBLIC_KEY =
  'BGtkbcjrO12YMoDuq2sCQeHlu47uPx3SHTgFKZFYiBW8Qr0D9vgyZSZPdw6_4ZFEI9Snk1VEAj2qTYI1I1YxBXE';
const DEV_VAPID_PRIVATE_KEY = 'I0_d0vnesxbBSUmlDdOKibGo6vEXRO-Vu88QlSlm5j0';

const vapidPublicKey = env.vapidPublicKey || DEV_VAPID_PUBLIC_KEY;
const vapidPrivateKey = env.vapidPrivateKey || DEV_VAPID_PRIVATE_KEY;

webpush.setVapidDetails(env.vapidSubject, vapidPublicKey, vapidPrivateKey);

function toRoleAudience(audience: Exclude<PushAudience, 'me'>): Role[] {
  if (audience === 'admins') {
    return ['admin'];
  }

  if (audience === 'agents') {
    return ['agent'];
  }

  return ['employee'];
}

function toWebPushSubscription(target: DeliveryTarget) {
  return {
    endpoint: target.endpoint,
    keys: {
      p256dh: target.p256dh,
      auth: target.auth,
    },
  };
}

function isGoneError(error: unknown): boolean {
  const statusCode =
    typeof error === 'object' && error !== null
      ? (error as { statusCode?: number }).statusCode
      : undefined;

  return statusCode === 404 || statusCode === 410;
}

async function sendToTargets(
  targets: DeliveryTarget[],
  payload: PushMessagePayload,
): Promise<PushSendResult> {
  if (!targets.length) {
    return {
      delivered: 0,
      failed: 0,
      removed: 0,
    };
  }

  const encodedPayload = JSON.stringify(payload);
  let delivered = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    targets.map(async (target) => {
      try {
        await webpush.sendNotification(toWebPushSubscription(target), encodedPayload, {
          TTL: 60,
          urgency: 'high',
          topic: payload.tag.slice(0, 32),
        });
        delivered += 1;
      } catch (error) {
        if (isGoneError(error)) {
          removed += Number(await deletePushSubscriptionByEndpoint(target.endpoint));
          return;
        }

        failed += 1;
        console.error('Push delivery failed', {
          endpoint: target.endpoint,
          email: target.email,
          error,
        });
      }
    }),
  );

  return { delivered, failed, removed };
}

export async function getPushConfig(userId: string) {
  return {
    supported: true,
    publicKey: vapidPublicKey,
    subscriptionCount: await countSubscriptionsByUserId(userId),
  };
}

export async function subscribeUserToPush(userId: string, subscription: PushSubscriptionInput) {
  await replacePushSubscription(userId, subscription);

  return getPushConfig(userId);
}

export async function unsubscribeUserFromPush(userId: string, endpoint: string) {
  await deletePushSubscription(userId, endpoint);

  return getPushConfig(userId);
}

export async function sendTestPush(
  requester: { id: string; role: Role },
  audience: PushAudience,
): Promise<PushSendResult> {
  if (audience !== 'me' && requester.role === 'employee') {
    throw new PushError(403, 'Employees can send test notifications only to themselves');
  }

  const targets =
    audience === 'me'
      ? await listDeliveryTargetsByUserIds([requester.id])
      : await listDeliveryTargetsByRoles(toRoleAudience(audience));

  const audienceLabel =
    audience === 'me'
      ? 'вам'
      : audience === 'admins'
        ? 'администраторам'
        : audience === 'agents'
          ? 'агентам'
          : 'сотрудникам';

  return sendToTargets(targets, {
    title: 'Тестовое уведомление',
    body:
      audience === 'me'
        ? 'Вам назначили тикет «Демо-задача»'
        : `Проверка push-уведомлений для роли: ${audienceLabel}`,
    url: '/tickets',
    tag: audience === 'me' ? 'ticket-assigned-test' : `role-broadcast-${audience}`,
  });
}

export async function notifyTicketAssigned(args: {
  userId: string;
  title: string;
  ticketId: string;
}) {
  const targets = await listDeliveryTargetsByUserIds([args.userId]);

  if (!targets.length) {
    return {
      delivered: 0,
      failed: 0,
      removed: 0,
    };
  }

  return sendToTargets(targets, {
    title: 'Вам назначили тикет',
    body: `Назначена задача: ${args.title}`,
    url: '/tickets',
    tag: `ticket-assigned-${args.ticketId}`.slice(0, 32),
  });
}
