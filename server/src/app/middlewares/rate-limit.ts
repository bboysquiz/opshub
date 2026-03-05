import type { Express } from 'express';
import rateLimit from 'express-rate-limit';

export function applyRateLimitMiddleware(app: Express): void {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
}
