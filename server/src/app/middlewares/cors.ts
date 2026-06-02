import type { Express } from 'express';
import cors from 'cors';

export function applyCorsMiddleware(app: Express, origin: string): void {
  const allowedOrigins = origin
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(requestOrigin, callback) {
        if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    }),
  );
}
