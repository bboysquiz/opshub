import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
} from './controller';
import { requireAccess } from './middleware';
import { requireCsrf } from '../csrf/csrf';

export const authRouter = Router();
const loginRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, try again later' },
});

authRouter.post('/auth/register', registerHandler);
authRouter.post('/auth/login', loginRateLimit, loginHandler);
authRouter.post('/auth/refresh', requireCsrf, refreshHandler);
authRouter.post('/auth/logout', requireCsrf, logoutHandler);
authRouter.get('/me', requireAccess, meHandler);
