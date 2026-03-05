import type { Express } from 'express';
import { authRouter } from '../auth/routes';
import { kbRouter } from '../kb/routes';
import { csrfRouter } from '../routes/csrf';
import { healthRouter } from '../routes/health';
import { ticketsRouter } from '../tickets/routes';

export function registerRoutes(app: Express): void {
  app.use(authRouter);
  app.use(healthRouter);
  app.use(csrfRouter);
  app.use(kbRouter);
  app.use(ticketsRouter);
}
