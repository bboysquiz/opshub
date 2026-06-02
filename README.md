# OpsHub

OpsHub - модульное рабочее пространство для операционной команды: тикеты, база знаний, аналитика, push-уведомления, activity feed, роли, feature flags и offline-first сценарии.

Проект собран как pnpm-монорепозиторий: Nuxt-хост отвечает за shell, SSR, PWA, навигацию и авторизацию, а доменные разделы подключаются как отдельные Vue/Vite remotes через Module Federation. Backend работает на Express и PostgreSQL.

## Что внутри

- `host-nuxt` - Nuxt 4 shell-приложение с layout, route guards, auth bootstrap, PWA, Service Worker и страницами `/`, `/profile`, `/notifications`, `/about`.
- `tickets-remote` - remote-модуль тикетов с CRUD, RBAC, Dexie, offline queue, локальной синхронизацией и feature flag для новой таблицы.
- `kb-remote` - remote-модуль базы знаний с чтением, поиском, редактированием, ETag/304, IndexedDB, Cache Storage и offline-read fallback.
- `analytics-remote` - remote-модуль аналитики с Chart.js, SLA-метриками, фильтрами в URL/sessionStorage и мемоизированными вычислениями.
- `server` - Express REST API: auth, tickets, KB, analytics, users, admin settings, SLA, push subscriptions, activity feed.
- `packages/shared-ui` - общие UI-примитивы, стили, директивы и composables.
- `packages/shared-config` - общие runtime-константы, включая `API_BASE_URL`.

## Стек

- Frontend: Nuxt 4, Vue 3, Vite, Quasar, Pinia, Module Federation.
- Offline/PWA: Workbox, `@vite-pwa/nuxt`, Service Worker, IndexedDB/Dexie, Cache Storage.
- Backend: Node.js, Express 5, PostgreSQL, Zod, bcrypt, JWT, cookie-parser.
- Quality: TypeScript, ESLint flat config, Prettier, Vitest, Vue Test Utils, jsdom, Husky, lint-staged.
- Infra: Docker Compose, PostgreSQL 16, nginx.

## Требования

- Node.js `^20.19.0` или `>=22.12.0`.
- pnpm `10.30.2`.
- Docker и Docker Compose для локальной PostgreSQL.

Если pnpm еще не включен через Corepack:

```bash
corepack enable
corepack prepare pnpm@10.30.2 --activate
```

## Быстрый старт

Установите зависимости:

```bash
pnpm install
```

Создайте `server/.env`:

```env
DATABASE_URL=postgres://opshub:opshub@localhost:5432/opshub
JWT_ACCESS_SECRET=replace-with-local-dev-secret
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

Опционально для web push можно добавить:

```env
VAPID_SUBJECT=mailto:opshub@example.local
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

Запустите БД, миграции, backend, host и все remotes одной командой:

```bash
pnpm dev:start
```

После запуска:

- Host: http://localhost:3000
- API: http://localhost:3001
- Tickets remote entry: http://localhost:3010/remoteEntry.js
- KB remote entry: http://localhost:3020/remoteEntry.js
- Analytics remote entry: http://localhost:3030/remoteEntry.js

Первый зарегистрированный пользователь автоматически становится `admin`, следующие - `employee`. Роли и feature flags можно менять в профиле администратора.

## Локальная инфраструктура

Только PostgreSQL:

```bash
pnpm docker:up:db
```

Дождаться готовности БД:

```bash
pnpm docker:wait:db
```

Применить миграции:

```bash
pnpm --filter server migrate
```

Остановить compose-сервисы:

```bash
pnpm docker:down
```

Полный docker-compose поднимает PostgreSQL, backend и nginx:

```bash
pnpm docker:up:full
```

nginx доступен на http://localhost:8080 и проксирует `/api/` на backend.

## Команды

| Команда                        | Что делает                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `pnpm dev:start`               | Поднимает БД, ждет готовности, применяет миграции и запускает весь dev-контур.               |
| `pnpm dev:core`                | Освобождает порты `3000`, `3001`, `3010`, `3020`, `3030` и запускает host, server и remotes. |
| `pnpm docker:up:db`            | Запускает только PostgreSQL из `docker-compose.yml`.                                         |
| `pnpm docker:up:full`          | Запускает PostgreSQL, backend container и nginx.                                             |
| `pnpm --filter server migrate` | Применяет SQL-миграции из `server/migrations`.                                               |
| `pnpm lint`                    | Запускает ESLint по workspace.                                                               |
| `pnpm format`                  | Форматирует проект Prettier.                                                                 |
| `pnpm test`                    | Запускает Vitest с coverage.                                                                 |
| `pnpm test:watch`              | Запускает Vitest в watch-режиме.                                                             |

Сборка отдельных приложений:

```bash
pnpm --filter host-nuxt build
pnpm --filter tickets-remote build
pnpm --filter kb-remote build
pnpm --filter analytics-remote build
```

Typecheck backend:

```bash
pnpm --filter server typecheck
```

## Архитектура

```text
opshub/
  apps/
    host-nuxt/          Nuxt shell, PWA, auth, navigation, route guards
    tickets-remote/     Tickets domain remote
    kb-remote/          Knowledge base domain remote
    analytics-remote/   Analytics domain remote
  packages/
    shared-ui/          Shared UI primitives, directives, composables, styles
    shared-config/      Shared runtime config
    shared-auth/        Reserved shared auth package
  server/
    src/                Express API modules
    migrations/         SQL migrations
  infra/
    nginx/              Local nginx config
```

Host загружает remotes на клиенте:

- `tickets_remote/TicketsApp` из `http://localhost:3010/remoteEntry.js`
- `kb_remote/KbApp` из `http://localhost:3020/remoteEntry.js`
- `analytics_remote/AnalyticsApp` из `http://localhost:3030/remoteEntry.js`

Общие зависимости `vue`, `pinia` и `quasar` шарятся через federation share scope.

## Деплой на Netlify

Проект можно задеплоить из одной GitHub-репы как несколько Netlify sites. У каждого приложения есть свой `netlify.toml`, поэтому при создании site в Netlify нужно выбрать соответствующий `Project to deploy`.

Порядок деплоя:

1. Создать внешнюю PostgreSQL БД, например Neon или Supabase.
2. Создать Netlify site для `server` и задать backend env.
3. Создать Netlify sites для `tickets-remote`, `kb-remote`, `analytics-remote`.
4. Создать Netlify site для `host-nuxt` и указать URL backend/remotes.

Настройки sites:

| Site             | Project to deploy       | Build command                          | Publish directory               |
| ---------------- | ----------------------- | -------------------------------------- | ------------------------------- |
| API              | `server`                | `pnpm --filter server netlify:build`   | `server/public`                 |
| Host             | `apps/host-nuxt`        | `pnpm --filter host-nuxt generate`     | `apps/host-nuxt/.output/public` |
| Tickets remote   | `apps/tickets-remote`   | `pnpm --filter tickets-remote build`   | `apps/tickets-remote/dist`      |
| KB remote        | `apps/kb-remote`        | `pnpm --filter kb-remote build`        | `apps/kb-remote/dist`           |
| Analytics remote | `apps/analytics-remote` | `pnpm --filter analytics-remote build` | `apps/analytics-remote/dist`    |

Backend env для Netlify site `server`:

```env
DATABASE_URL=postgres://...
JWT_ACCESS_SECRET=replace-with-long-random-secret
CORS_ORIGIN=https://opshub.netlify.app,https://opshub-tickets-remote.netlify.app,https://opshub-kb-remote.netlify.app,https://opshub-analytics-remote.netlify.app
VAPID_SUBJECT=mailto:you@example.com
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

Frontend env для remotes:

```env
VITE_API_BASE_URL=https://opshub-api.netlify.app
```

Frontend env для host:

```env
NUXT_PUBLIC_API_BASE_URL=https://opshub-api.netlify.app
NUXT_PUBLIC_TICKETS_REMOTE_ENTRY_URL=https://opshub-tickets-remote.netlify.app/remoteEntry.js
NUXT_PUBLIC_KB_REMOTE_ENTRY_URL=https://opshub-kb-remote.netlify.app/remoteEntry.js
NUXT_PUBLIC_ANALYTICS_REMOTE_ENTRY_URL=https://opshub-analytics-remote.netlify.app/remoteEntry.js
PNPM_FLAGS=--shamefully-hoist
```

`DATABASE_URL`, `JWT_ACCESS_SECRET` и `VAPID_PRIVATE_KEY` указываются только на API-site. В frontend-sites добавляются только публичные URL-переменные.

## Backend API

Основные группы маршрутов:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`
- `GET /csrf`
- `GET /health`
- `GET /tickets`, `POST /tickets`, `PATCH /tickets/:id`, `DELETE /tickets/:id`
- `GET /kb/articles`, `GET /kb/articles/search`, `GET /kb/articles/:slug`
- `POST /kb/articles`, `PATCH /kb/articles/:id`, `DELETE /kb/articles/:id`
- `GET /analytics/tickets`
- `GET /activity/feed`
- `GET /users/options`
- `GET /admin/users`, `PATCH /admin/users/:id`
- `GET /admin/sla-settings`, `PATCH /admin/sla-settings`
- `GET /push/config`, `POST /push/subscribe`, `POST /push/unsubscribe`, `POST /push/test`

Write-запросы защищены access JWT и CSRF. Refresh token хранится в HttpOnly cookie на `/auth`, access token живет в памяти клиентского store.

## Роли и доступ

- `admin` - полный доступ: аналитика, управление пользователями, роли, feature flags, SLA-настройки, тикеты и KB.
- `agent` - аналитика и работа с тикетами/KB без админских настроек.
- `employee` - базовый пользователь, работа со своими тикетами и доступ к разрешенным разделам.

Права проверяются и в UI, и на backend.

## Тесты и coverage

Vitest настроен в корне и покрывает `apps/**/*.spec.ts`, `packages/**/*.spec.ts`, `tests/**/*.spec.ts`.

```bash
pnpm test
```

HTML coverage пишется в:

```text
coverage/frontend/
```

## Заметки по разработке

- Для честной проверки PWA/offline-flow лучше использовать production build + preview. В dev PWA намеренно отключена.
- Remotes в dev-режиме сначала собираются, затем запускаются через `vite preview --strictPort`, чтобы host видел стабильный `remoteEntry.js`.
- API URL по умолчанию указывает на `http://localhost:3001`. Для remotes его можно переопределить через `VITE_API_BASE_URL`, для host - через `NUXT_PUBLIC_API_BASE_URL`.
- Миграции идут в лексикографическом порядке и фиксируются в служебной таблице `schema_migrations`.
