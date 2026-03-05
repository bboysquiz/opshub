import type { Express } from 'express';
import helmet from 'helmet';

export function applySecurityMiddleware(app: Express): void {
  app.use(helmet());
}
