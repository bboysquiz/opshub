import { adminRouter } from '../admin/routes';
import { analyticsRouter } from '../analytics/routes';
import type { Express } from 'express';
import { authRouter } from '../auth/routes';
import { kbRouter } from '../kb/routes';
import { pushRouter } from '../push/routes';
import { csrfRouter } from '../routes/csrf';
import { healthRouter } from '../routes/health';
import { ticketsRouter } from '../tickets/routes';
import { usersRouter } from '../users/routes';

export function registerRoutes(app: Express): void {
  app.use(authRouter);
  app.use(adminRouter);
  app.use(healthRouter);
  app.use(csrfRouter);
  app.use(analyticsRouter);
  app.use(kbRouter);
  app.use(pushRouter);
  app.use(ticketsRouter);
  app.use(usersRouter);
}
