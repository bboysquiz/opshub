# OpsHub Host

Nuxt host-shell для OpsHub. Host собирается как статический Netlify site через `nuxt generate`, публикует `.output/public`, подключает remote entry-файлы и обращается к backend через same-origin `/api`.

## Netlify

Создавайте отдельный Netlify site с `Project to deploy` = `apps/host-nuxt`.

```toml
[build]
  command = "pnpm --filter host-nuxt netlify:build"
  publish = "apps/host-nuxt/.output/public"
```

`netlify:build` делает две вещи:

- генерирует статический host в `.output/public`;
- записывает `.output/public/_redirects` с `/api/* -> NETLIFY_API_PROXY_URL/:splat` и SPA fallback `/* -> /index.html`.

Обязательные env для production/preview/staging:

```env
NUXT_PUBLIC_API_BASE_URL=/api
NETLIFY_API_PROXY_URL=https://opshub-api.netlify.app
NUXT_PUBLIC_TICKETS_REMOTE_ENTRY_URL=https://opshub-tickets.netlify.app/remoteEntry.js
NUXT_PUBLIC_KB_REMOTE_ENTRY_URL=https://opshub-kb.netlify.app/remoteEntry.js
NUXT_PUBLIC_ANALYTICS_REMOTE_ENTRY_URL=https://opshub-analytics.netlify.app/remoteEntry.js
PNPM_FLAGS=--shamefully-hoist
```

Для preview/staging переопределяйте `NETLIFY_API_PROXY_URL` на preview/staging API-site, а `NUXT_PUBLIC_*_REMOTE_ENTRY_URL` на соответствующие preview/staging remotes.

## Smoke Check

После деплоя откройте host deploy URL в новой вкладке и проверьте:

- `/` открывает приложение, а прямой переход на `/tickets`, `/kb`, `/analytics`, `/spaces` не дает 404;
- `/api/health` на host URL возвращает `{"ok":true}` через Netlify proxy;
- вкладки с remotes загружаются из `NUXT_PUBLIC_*_REMOTE_ENTRY_URL`.

Если `/api/health` не отвечает, проверьте `NETLIFY_API_PROXY_URL` на host site и `DATABASE_URL`/миграции на API-site.
