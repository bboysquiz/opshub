import type { Express } from 'express';
import { env } from '../config/env';
import { applyCorsMiddleware } from './middlewares/cors';
import { applyParserMiddleware } from './middlewares/parsers';
import { applyRateLimitMiddleware } from './middlewares/rate-limit';
import { applySecurityMiddleware } from './middlewares/security';

export function registerMiddlewares(app: Express): void {
  app.set('trust proxy', 1);

  applySecurityMiddleware(app);
  applyRateLimitMiddleware(app);
  applyCorsMiddleware(app, env.corsOrigin);
  applyParserMiddleware(app);
}
