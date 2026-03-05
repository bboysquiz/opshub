import { createApp } from './app/create-app';
import { env } from './config/env';

const app = createApp();

app.listen(env.port, '0.0.0.0', () => {
  console.log(`[server] listening on http://localhost:${env.port}`);
});
