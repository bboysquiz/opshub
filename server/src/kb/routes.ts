import { Router } from 'express';
import { getKbArticleBySlugHandler, listKbArticlesHandler } from './controller';

export const kbRouter = Router();

kbRouter.get('/kb/articles', listKbArticlesHandler);
kbRouter.get('/kb/articles/:slug', getKbArticleBySlugHandler);
