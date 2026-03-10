import type { Request, Response } from 'express';
import { isPushError } from './errors';
import { pushSubscriptionSchema, pushTestSchema, pushUnsubscribeSchema } from './schemas';
import {
  getPushConfig,
  sendTestPush,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from './service';

function handlePushError(error: unknown, res: Response): Response {
  if (isPushError(error)) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: 'Internal server error' });
}

export async function pushConfigHandler(req: Request, res: Response): Promise<Response> {
  if (!req.user?.sub) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    return res.json(await getPushConfig(req.user.sub));
  } catch (error) {
    return handlePushError(error, res);
  }
}

export async function pushSubscribeHandler(req: Request, res: Response): Promise<Response> {
  if (!req.user?.sub) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const parsed = pushSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  try {
    return res.status(201).json(await subscribeUserToPush(req.user.sub, parsed.data));
  } catch (error) {
    return handlePushError(error, res);
  }
}

export async function pushUnsubscribeHandler(req: Request, res: Response): Promise<Response> {
  if (!req.user?.sub) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const parsed = pushUnsubscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  try {
    return res.json(await unsubscribeUserFromPush(req.user.sub, parsed.data.endpoint));
  } catch (error) {
    return handlePushError(error, res);
  }
}

export async function pushTestHandler(req: Request, res: Response): Promise<Response> {
  if (!req.user?.sub) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const parsed = pushTestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  try {
    return res.json(
      await sendTestPush(
        {
          id: req.user.sub,
          role: req.user.role,
        },
        parsed.data.audience,
      ),
    );
  } catch (error) {
    return handlePushError(error, res);
  }
}
