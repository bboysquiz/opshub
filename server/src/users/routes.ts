import { Router } from 'express';
import { requireAccess } from '../auth/middleware';
import { listAssignableUsersHandler } from './controller';

export const usersRouter = Router();

usersRouter.get('/users/options', requireAccess, listAssignableUsersHandler);
