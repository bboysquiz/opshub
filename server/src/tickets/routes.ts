import { Router } from 'express';
import { requireAccess, requireRoles } from '../auth/middleware';
import { requireCsrf } from '../csrf/csrf';
import {
  createTicketHandler,
  deleteTicketHandler,
  listTicketsHandler,
  patchTicketHandler,
} from './controller';

export const ticketsRouter = Router();

ticketsRouter.get('/tickets', requireAccess, listTicketsHandler);
ticketsRouter.post('/tickets', requireAccess, requireCsrf, createTicketHandler);
ticketsRouter.patch(
  '/tickets/:id',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  patchTicketHandler,
);
ticketsRouter.delete(
  '/tickets/:id',
  requireAccess,
  requireRoles('admin'),
  requireCsrf,
  deleteTicketHandler,
);
