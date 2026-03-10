import { Router } from 'express';
import { requireAccess } from '../auth/middleware';
import { requireCsrf } from '../csrf/csrf';
import {
  pushConfigHandler,
  pushSubscribeHandler,
  pushTestHandler,
  pushUnsubscribeHandler,
} from './controller';

export const pushRouter = Router();

pushRouter.get('/push/config', requireAccess, pushConfigHandler);
pushRouter.post('/push/subscribe', requireAccess, requireCsrf, pushSubscribeHandler);
pushRouter.post('/push/unsubscribe', requireAccess, requireCsrf, pushUnsubscribeHandler);
pushRouter.post('/push/test', requireAccess, requireCsrf, pushTestHandler);
