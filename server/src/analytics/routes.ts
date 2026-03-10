import { Router } from 'express';
import { requireAccess } from '../auth/middleware';
import { listAnalyticsTicketsHandler } from './controller';

export const analyticsRouter = Router();

analyticsRouter.get('/analytics/tickets', requireAccess, listAnalyticsTicketsHandler);
