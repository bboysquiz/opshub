import { Router } from 'express';
import { requireAccess, requireRoles } from '../auth/middleware';
import { requireCsrf } from '../csrf/csrf';
import {
  createKbArticleHandler,
  deleteKbArticleHandler,
  getKbArticleBySlugHandler,
  listKbArticlesHandler,
  patchKbArticleHandler,
  searchKbArticlesHandler,
} from './controller';

export const kbRouter = Router();

kbRouter.get('/kb/articles', listKbArticlesHandler);
kbRouter.get('/kb/articles/search', searchKbArticlesHandler);
kbRouter.get('/kb/articles/:slug', getKbArticleBySlugHandler);
kbRouter.post(
  '/kb/articles',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  createKbArticleHandler,
);
kbRouter.patch(
  '/kb/articles/:id',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  patchKbArticleHandler,
);
kbRouter.delete(
  '/kb/articles/:id',
  requireAccess,
  requireRoles('admin', 'agent'),
  requireCsrf,
  deleteKbArticleHandler,
);
