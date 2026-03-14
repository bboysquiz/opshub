import { Router } from 'express';
import { requireAccess, requireRoles } from '../auth/middleware';
import {
  getAdminSlaSettingsHandler,
  listAdminUsersHandler,
  patchAdminSlaSettingsHandler,
  patchAdminUserAccessHandler,
} from './controller';

export const adminRouter = Router();

adminRouter.get('/admin/users', requireAccess, requireRoles('admin'), listAdminUsersHandler);
adminRouter.get(
  '/admin/sla-settings',
  requireAccess,
  requireRoles('admin'),
  getAdminSlaSettingsHandler,
);
adminRouter.patch(
  '/admin/users/:id',
  requireAccess,
  requireRoles('admin'),
  patchAdminUserAccessHandler,
);
adminRouter.patch(
  '/admin/sla-settings',
  requireAccess,
  requireRoles('admin'),
  patchAdminSlaSettingsHandler,
);
