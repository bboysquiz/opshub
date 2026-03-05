import express from 'express';
import { registerMiddlewares } from './register-middlewares';
import { registerRoutes } from './register-routes';

export function createApp() {
  const app = express();

  registerMiddlewares(app);
  registerRoutes(app);

  return app;
}
