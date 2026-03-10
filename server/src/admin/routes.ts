import { Router } from 'express';
import { requireAccess, requireRoles } from '../auth/middleware';
import { listAdminUsersHandler, patchAdminUserAccessHandler } from './controller';

export const adminRouter = Router();

adminRouter.get('/admin/users', requireAccess, requireRoles('admin'), listAdminUsersHandler);
adminRouter.patch(
  '/admin/users/:id',
  requireAccess,
  requireRoles('admin'),
  patchAdminUserAccessHandler,
);
