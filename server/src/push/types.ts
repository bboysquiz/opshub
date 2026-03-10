import type { Role } from '../auth/types';

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: Date | string;
};

export type DeliveryTarget = PushSubscriptionRow & {
  email: string;
  role: Role;
};

export type PushAudience = 'me' | 'admins' | 'agents' | 'employees';

export type PushMessagePayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export type PushSendResult = {
  delivered: number;
  failed: number;
  removed: number;
};
