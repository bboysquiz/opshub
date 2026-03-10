import { Router } from 'express';
import { requireAccess, requireRoles } from '../auth/middleware';
import { listAnalyticsTicketsHandler } from './controller';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/analytics/tickets',
  requireAccess,
  requireRoles('admin', 'agent'),
  listAnalyticsTicketsHandler,
);
