import { Router } from 'express';
import { requireAccess } from '../auth/middleware';
import { listActivityFeedHandler } from './controller';

export const activityRouter = Router();

activityRouter.get('/activity/feed', requireAccess, listActivityFeedHandler);
