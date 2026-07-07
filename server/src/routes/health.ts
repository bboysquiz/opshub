import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'opshub-api',
    health: '/health',
  });
});

healthRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});
