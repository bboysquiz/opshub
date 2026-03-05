import type { Express } from 'express';
import cors from 'cors';

export function applyCorsMiddleware(app: Express, origin: string): void {
  app.use(
    cors({
      origin,
      credentials: true,
    }),
  );
}
