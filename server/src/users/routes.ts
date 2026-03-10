import { Router } from 'express';
import { requireAccess, requireRoles } from '../auth/middleware';
import { listAssignableUsersHandler } from './controller';

export const usersRouter = Router();

usersRouter.get(
  '/users/options',
  requireAccess,
  requireRoles('admin', 'agent'),
  listAssignableUsersHandler,
);
