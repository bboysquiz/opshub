import { Router } from 'express';
import { requireAccess, requireRoles } from '../auth/middleware';
import { requireCsrf } from '../csrf/csrf';
import {
  addProjectMemberHandler,
  addSpaceMemberHandler,
  createProjectHandler,
  createSpaceHandler,
  deleteProjectHandler,
  deleteSpaceHandler,
  listProjectMembersHandler,
  listSpaceMembersHandler,
  listSpaceProjectsHandler,
  listSpacesHandler,
  patchProjectHandler,
  patchSpaceHandler,
  removeProjectMemberHandler,
  removeSpaceMemberHandler,
} from './controller';

export const spacesRouter = Router();

spacesRouter.get('/spaces', requireAccess, listSpacesHandler);
spacesRouter.post(
  '/spaces',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  createSpaceHandler,
);
spacesRouter.patch(
  '/spaces/:spaceId',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  patchSpaceHandler,
);
spacesRouter.delete(
  '/spaces/:spaceId',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  deleteSpaceHandler,
);
spacesRouter.get('/spaces/:spaceId/members', requireAccess, listSpaceMembersHandler);
spacesRouter.post(
  '/spaces/:spaceId/members',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  addSpaceMemberHandler,
);
spacesRouter.delete(
  '/spaces/:spaceId/members/:userId',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  removeSpaceMemberHandler,
);
spacesRouter.get('/spaces/:spaceId/projects', requireAccess, listSpaceProjectsHandler);
spacesRouter.post(
  '/spaces/:spaceId/projects',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  createProjectHandler,
);
spacesRouter.patch(
  '/spaces/:spaceId/projects/:projectId',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  patchProjectHandler,
);
spacesRouter.delete(
  '/spaces/:spaceId/projects/:projectId',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  deleteProjectHandler,
);
spacesRouter.get(
  '/spaces/:spaceId/projects/:projectId/members',
  requireAccess,
  listProjectMembersHandler,
);
spacesRouter.post(
  '/spaces/:spaceId/projects/:projectId/members',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  addProjectMemberHandler,
);
spacesRouter.delete(
  '/spaces/:spaceId/projects/:projectId/members/:userId',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  removeProjectMemberHandler,
);
