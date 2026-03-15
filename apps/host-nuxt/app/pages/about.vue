<script setup lang="ts">
import { OpPageHeader, OpPanel } from '@opshub/shared-ui';

type SummaryCard = {
  title: string;
  caption: string;
};

type PageDescription = {
  path: string;
  title: string;
  description: string;
};

const summaryCards: SummaryCard[] = [
  {
    title: 'Host + remotes',
    caption:
      'Nuxt-хост отвечает за shell, SSR, PWA, навигацию, auth и guard’ы, а доменные модули подключаются как отдельные Vite remotes через Module Federation.',
  },
  {
    title: 'Backend',
    caption:
      'Express + PostgreSQL дают auth, CRUD, аналитику, push-уведомления, SLA-настройки, activity feed и серверный search для базы знаний.',
  },
  {
    title: 'Offline-first части',
    caption:
      'Тикеты и база знаний используют IndexedDB, локальный кэш, fallback-стратегии чтения и Service Worker/PWA для повторного использования данных без сети.',
  },
  {
    title: 'Безопасность',
    caption:
      'Access JWT хранится в памяти, refresh token уходит в HttpOnly cookie, write-запросы закрыты CSRF, backend использует Helmet, CORS и rate limiting.',
  },
];

const pages: PageDescription[] = [
  {
    path: '/',
    title: 'Рабочий стол',
    description:
      'Домашняя страница с быстрыми переходами по модулям и лентой последних событий. Источник данных для ленты — activity_events на backend.',
  },
  {
    path: '/tickets',
    title: 'Тикеты',
    description:
      'Основной доменный модуль: CRUD, офлайн-очередь, локальная очередь синхронизации, права по ролям и owner-based ограничения, таблица с фильтрами и feature flag для новой версии таблицы.',
  },
  {
    path: '/kb',
    title: 'База знаний',
    description:
      'Список, поиск, просмотр и редактирование статей. Чтение доступно шире, а write-операции ограничены admin/agent. В онлайне поиск идёт по всей базе, в офлайне — по локальному кэшу.',
  },
  {
    path: '/analytics',
    title: 'Аналитика',
    description:
      'Графики SLA, статусов и динамики тикетов, фильтры с сохранением в URL и sessionStorage, мемоизированные вычисления и reduced-motion для графиков.',
  },
  {
    path: '/notifications',
    title: 'Уведомления',
    description:
      'Подписка и отписка от web push-уведомлений. В preview/build работает Service Worker, а push-уведомления приходят по событиям тикетов и могут дублировать локальные toasts.',
  },
  {
    path: '/profile',
    title: 'Профиль и настройки',
    description:
      'Вход, регистрация, сведения о пользователе, админская настройка ролей и feature flags, а также бизнес-настройка SLA с автообновлением страницы без websocket.',
  },
  {
    path: '/about',
    title: 'О проекте',
    description:
      'Эта страница — встроенная техдокументация по архитектуре, страницам, безопасности, кэшированию, офлайн-сценариям и выбранным технологиям.',
  },
];

const architectureCards: SummaryCard[] = [
  {
    title: 'Nuxt host',
    caption:
      'SSR-оболочка, общая навигация, theme toggle, route guards, auth bootstrap, activity feed, PWA и Service Worker. Хост отвечает за UX-скелет и собирает доменные remotes в одно приложение.',
  },
  {
    title: 'Tickets remote',
    caption:
      'Vue 3 + Vite remote с CRUD, Dexie, офлайн-очередью, memory cache, авто-синхронизацией и ролевыми ограничениями. Это самый сложный по клиентской логике модуль.',
  },
  {
    title: 'KB remote',
    caption:
      'Vue 3 + Vite remote для базы знаний. Здесь используются ETag/304, Cache Storage, IndexedDB, локальный MiniSearch и серверный search по всей KB.',
  },
  {
    title: 'Analytics remote',
    caption:
      'Vue 3 + Vite remote с Chart.js, memoized calculations, хранением фильтров в URL и sessionStorage, плюс отдельным SLA-конфигом, который админ настраивает в профиле.',
  },
  {
    title: 'Express API',
    caption:
      'REST API поверх PostgreSQL: auth, tickets, KB, analytics, push, users/options, admin settings, SLA и activity feed. Миграции лежат в server/migrations.',
  },
  {
    title: 'Shared packages',
    caption:
      'shared-ui — BEM-обёртки и общие стили; shared-config — общие URL/конфиги. Это снижает связность и убирает дублирование между remotes.',
  },
];

const storageCards: SummaryCard[] = [
  {
    title: 'IndexedDB',
    caption:
      'Тикеты и база знаний используют Dexie. В тикетах хранится локальная версия данных, очередь команд и техническая meta-информация. В KB — статьи и ETag/meta.',
  },
  {
    title: 'Memory cache',
    caption:
      'В тикетах есть краткоживущий in-memory cache с TTL 15 секунд. Он нужен для быстрых повторных чтений и экономии лишних походов в IndexedDB/сеть.',
  },
  {
    title: 'Cache Storage',
    caption:
      'В KB используется Cache Storage как резерв для JSON-ответов статей, а в Service Worker Workbox кеширует remote assets и часть GET API.',
  },
  {
    title: 'SessionStorage',
    caption:
      'Аналитика сохраняет фильтры в sessionStorage и URL. Ещё sessionStorage используется в dev-логике очистки старого SW, чтобы не зациклить reload.',
  },
  {
    title: 'Cookies',
    caption:
      'Refresh token живёт в HttpOnly cookie на /auth, CSRF-токен в обычной cookie, чтобы клиент мог положить его в x-csrf-token при write-запросах.',
  },
];

const patterns: SummaryCard[] = [
  {
    title: 'Command pattern',
    caption:
      'Офлайн-очередь тикетов хранит команды create/update/delete как отдельные объекты и выполняет их позже при появлении доступного API.',
  },
  {
    title: 'Strategy',
    caption:
      'В тикетах есть стратегии чтения network_first / idb_first / cache_first. В KB есть ветвление между сетью, IndexedDB и Cache Storage.',
  },
  {
    title: 'Observer / events',
    caption:
      'Синхронизация тикетов рассылает события sync-started, sync-finished, queue-changed и sync-failed, а UI уже подписывается на эти изменения через store/state.',
  },
  {
    title: 'Composables',
    caption:
      'useRemoteModule, useReducedMotion, useAnalyticsFiltersPersistence, useMemoizedAnalytics и другие composables собирают повторяемую client-логику в независимые функции.',
  },
  {
    title: 'Slots',
    caption:
      'OpPageHeader использует slots.meta и slots.actions, OpPanel — slots.header/default, а QTable в тикетах, аналитике и профиле рендерится через scoped slots body-cell-*.',
  },
  {
    title: 'Proxy patch tracker',
    caption:
      'В тикетах custom Proxy собирает минимальный update-patch при редактировании: в offline-queue попадают только реально изменённые поля, без лишних значений без изменений.',
  },
  {
    title: 'Custom directive',
    caption:
      'В shared-ui зарегистрирована v-focus-when: она находит focusable-элемент внутри Quasar-компонента и ставит фокус при открытии диалога или формы. Сейчас директива уже используется в создании тикета.',
  },
  {
    title: 'GSAP',
    caption:
      'На рабочем столе GSAP подключается только на клиенте и анимирует intro-сценарий карточек и activity feed. Это точечный motion-слой для dashboard, а не глобальная декоративная анимация.',
  },
  {
    title: 'requestAnimationFrame',
    caption:
      'В тикетах requestAnimationFrame плавно догоняет отображаемый прогресс офлайн-синхронизации до фактических значений очереди, чтобы sync strip и счётчики не дёргались дискретными скачками.',
  },
  {
    title: 'CSS keyframes',
    caption:
      'В sync UI тикетов keyframes используются для queue glow, sync pulse, conflict beacon и shimmer у progress bar. Это лёгкий статусный motion-слой без лишнего JS.',
  },
];

const toolingCards: SummaryCard[] = [
  {
    title: 'pnpm workspace',
    caption:
      'Монорепозиторий живёт на pnpm workspace: корневые команды используют -r, --parallel и --filter, чтобы поднимать host, server и remotes как один проект, но без жёсткой сцепки.',
  },
  {
    title: 'ESLint',
    caption:
      'В корне лежит единый flat-config для TypeScript и Vue. Линтер проверяет и script, и template-части .vue-файлов, поэтому ошибки и спорные места ловятся на уровне всего workspace.',
  },
  {
    title: 'Prettier',
    caption:
      'Форматирование вынесено в общий .prettierrc и корневой script format. Один стиль применяется к TS, Vue, JSON, Markdown и YAML, чтобы не расползался code style.',
  },
  {
    title: 'Vitest',
    caption:
      'Фронтенд покрыт unit и smoke-тестами на Vitest: общий test-контур поднимает jsdom, stubs для Nuxt/Quasar, проверяет utils, composables, directives и ключевые страницы host/remotes, а coverage собирается отдельным корневым прогоном.',
  },
  {
    title: 'Git hooks',
    caption:
      'Через Husky и lint-staged pre-commit запускает eslint --fix и prettier по staged-файлам. Это даёт быстрый локальный quality gate ещё до push и CI.',
  },
  {
    title: 'Docker',
    caption:
      'docker-compose поднимает PostgreSQL, backend и nginx, а root-скрипты docker:up:db и docker:up:full упрощают локальный старт и интеграционные прогоны без ручной сборки окружения.',
  },
];
</script>

<template>
  <section class="about-page op-page q-pa-md">
    <OpPageHeader
      title="О проекте"
      subtitle="Подробное описание OpsHub: архитектура, страницы, офлайн-логика, безопасность, кэширование, роли, feature flags, PWA и реальные технические решения, которые уже есть в коде."
    />

    <div class="row q-col-gutter-md">
      <div class="col-12 col-xl-8">
        <OpPanel
          title="Что такое OpsHub"
          caption="Это не лендинг и не набор статических моков, а модульное внутреннее рабочее пространство с реальным backend, auth, CRUD, offline-first поведением и PWA-инфраструктурой."
        >
          <div class="about-page__content">
            <p>
              OpsHub — это учебно-практический проект в формате внутренней корпоративной платформы.
              Главная идея — показать, как можно собрать приложение из нескольких доменных
              микрофронтендов, не потеряв единый UX, единую систему доступа и общую инфраструктуру
              вокруг auth, PWA, push, activity feed, SLA и админских настроек.
            </p>
            <p>
              В текущем виде проект показывает сразу несколько важных инженерных сценариев:
              офлайн-очередь для тикетов, ETag и offline-read для базы знаний, фильтры и мемоизацию
              для аналитики, браузерные push-уведомления, RBAC, feature flags и activity log,
              который фиксирует ключевые действия по тикетам и статьям KB.
            </p>
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-xl-4">
        <OpPanel title="Ключевые идеи" caption="Коротко о том, что именно демонстрирует проект.">
          <div class="row q-col-gutter-sm">
            <div v-for="card in summaryCards" :key="card.title" class="col-12">
              <div class="about-page__mini-card">
                <div class="about-page__mini-title">
                  {{ card.title }}
                </div>
                <div class="about-page__mini-caption">
                  {{ card.caption }}
                </div>
              </div>
            </div>
          </div>
        </OpPanel>
      </div>
    </div>

    <OpPanel
      title="Архитектура и стек"
      caption="Host + remotes + backend, с чётким разделением ответственности между уровнями."
    >
      <div class="row q-col-gutter-md">
        <div v-for="card in architectureCards" :key="card.title" class="col-12 col-md-6 col-xl-4">
          <div class="about-page__mini-card">
            <div class="about-page__mini-title">
              {{ card.title }}
            </div>
            <div class="about-page__mini-caption">
              {{ card.caption }}
            </div>
          </div>
        </div>
      </div>

      <div class="about-page__content q-mt-lg">
        <h2 class="about-page__section-title">Почему выбран Nuxt</h2>
        <ul class="about-page__list">
          <li>
            Nuxt даёт SSR-оболочку, удобный routing, PWA-интеграцию, хорошую DX-модель и нормальную
            базу для страниц, которые полезно отдавать с сервера.
          </li>
          <li>
            Для этого проекта Nuxt особенно удобен как host-shell: он держит layout, middleware,
            auth bootstrap, системные страницы и единый entry-point для remotes.
          </li>
          <li>
            KB и публичные страницы в такой схеме можно развивать в сторону более SEO-friendly
            сценариев, а интерактивные домены при этом остаются в remotes.
          </li>
        </ul>

        <h2 class="about-page__section-title">Зачем нужен Quasar</h2>
        <ul class="about-page__list">
          <li>
            Quasar ускоряет сборку интерфейса: таблицы, формы, диалоги, drawer, toolbar, badges,
            banners, selects, notifications и layout-компоненты уже готовы.
          </li>
          <li>
            Это позволяет не тратить время на ручную сборку UI-kit и сосредоточиться на архитектуре,
            безопасности, кэше, ролях и product-like сценариях.
          </li>
          <li>
            При этом поверх Quasar есть собственный слой shared-ui с BEM-обёртками OpPanel и
            OpPageHeader, чтобы не разбрасывать стили хаотично по проекту.
          </li>
        </ul>
      </div>
    </OpPanel>

    <OpPanel
      title="Tooling и workflow"
      caption="Чем в проекте поддерживаются монорепозиторий, кодстайл и локальная инфраструктура."
    >
      <div class="row q-col-gutter-md">
        <div v-for="card in toolingCards" :key="card.title" class="col-12 col-md-6 col-xl-4">
          <div class="about-page__mini-card">
            <div class="about-page__mini-title">
              {{ card.title }}
            </div>
            <div class="about-page__mini-caption">
              {{ card.caption }}
            </div>
          </div>
        </div>
      </div>
    </OpPanel>

    <OpPanel title="Страницы приложения" caption="Что делает каждая страница и зачем она нужна.">
      <q-list separator bordered class="about-page__pages-list rounded-borders">
        <q-item v-for="page in pages" :key="page.path" class="about-page__page-item items-start">
          <q-item-section avatar class="about-page__page-path">
            <q-badge color="primary">
              {{ page.path }}
            </q-badge>
          </q-item-section>
          <q-item-section class="about-page__page-main">
            <q-item-label class="text-weight-medium">
              {{ page.title }}
            </q-item-label>
            <q-item-label caption class="about-page__item-caption">
              {{ page.description }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </OpPanel>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-xl-6">
        <OpPanel
          title="Тикеты"
          caption="Главный доменный модуль: CRUD, офлайн, роли, фильтры, feature flag и owner-based права."
        >
          <div class="about-page__content">
            <h2 class="about-page__section-title">Как работает</h2>
            <ul class="about-page__list">
              <li>
                Страница показывает таблицу тикетов, фильтры, создание нового тикета и карточку
                просмотра/редактирования по клику на строку.
              </li>
              <li>
                В таблице есть сортировка по колонкам и фильтрация по поиску, приоритету, статусу,
                назначению, статусу синхронизации и периоду по полю «Обновлён».
              </li>
              <li>
                Feature flag «Новая таблица тикетов» включает альтернативный режим: дополнительную
                колонку «Создан», виртуализацию, более плотную таблицу и немного другой UX списка.
              </li>
            </ul>

            <h2 class="about-page__section-title">Офлайн и синхронизация</h2>
            <ul class="about-page__list">
              <li>
                Тикеты хранятся в IndexedDB через Dexie. Там же лежит очередь команд
                create/update/delete и техническая meta-информация о синке.
              </li>
              <li>
                Каждый offline-write превращается в команду. Это реализация Command pattern: команды
                сортируются, сохраняются и позже выполняются sync engine’ом.
              </li>
              <li>
                Для чтения используются стратегии network_first, idb_first и cache_first. Это
                реализация Strategy pattern поверх dataSource.
              </li>
              <li>
                В модуле есть memory cache с TTL 15 секунд, чтобы не ходить лишний раз в IndexedDB и
                не дёргать API при каждом повторном рендере.
              </li>
              <li>
                Состояние доступности опирается не только на navigator.onLine, но и на фактическую
                доступность API. Если backend недоступен, изменения остаются в очереди и не
                становятся «синхронизированными» до подтверждения сервера.
              </li>
              <li>
                Конфликт определяется по baseUpdatedAt: если серверная версия изменилась раньше, чем
                локальная правка дошла до API, команда помечается как conflict.
              </li>
            </ul>

            <h2 class="about-page__section-title">Права и CRUD</h2>
            <ul class="about-page__list">
              <li>admin видит общую таблицу и имеет максимальный набор действий.</li>
              <li>
                agent работает с тикетами и аналитикой, а также может удалять собственные тикеты.
              </li>
              <li>
                employee может работать со своими тикетами даже после синхронизации, но не получает
                доступ к аналитике и админским настройкам.
              </li>
              <li>
                На уровне API и UI действуют одинаковые ограничения: это важно, потому что скрыть
                кнопку недостаточно — сервер тоже должен отрезать запрещённое действие.
              </li>
            </ul>
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-xl-6">
        <OpPanel
          title="База знаний"
          caption="KB сочетает обычный read/write CRUD, глобальный поиск, ETag, локальный кэш и offline-read."
        >
          <div class="about-page__content">
            <h2 class="about-page__section-title">Как устроена KB</h2>
            <ul class="about-page__list">
              <li>
                База знаний — это отдельный remote с двумя главными режимами: чтение статей для всех
                и write-режим для admin/agent.
              </li>
              <li>
                Список статей, серверный поиск, просмотр статьи, создание, редактирование и удаление
                работают через REST API backend.
              </li>
              <li>
                Поиск в онлайне идёт по всей базе через backend. В офлайне есть fallback на
                локальный MiniSearch по тем статьям, которые уже были загружены в кэш.
              </li>
            </ul>

            <h2 class="about-page__section-title">ETag и 304</h2>
            <ul class="about-page__list">
              <li>
                Для получения статьи клиент сохраняет ETag в IndexedDB и затем отправляет
                If-None-Match на GET /kb/articles/:slug.
              </li>
              <li>
                Если сервер отвечает 304, статья не скачивается повторно: клиент достаёт её из
                IndexedDB или Cache Storage.
              </li>
              <li>
                Это снижает сетевую нагрузку и делает KB хорошим примером продвинутого HTTP cache
                validation, а не просто слепого fetch.
              </li>
            </ul>

            <h2 class="about-page__section-title">Офлайн</h2>
            <ul class="about-page__list">
              <li>
                Полные статьи сохраняются в IndexedDB, а JSON-ответы статей дополнительно кладутся в
                Cache Storage.
              </li>
              <li>
                Если сети нет, KB сразу использует локальный fallback и не делает лишних сетевых
                запросов.
              </li>
              <li>
                В отличие от тикетов, KB — это прежде всего offline-read, а не offline-write модуль.
              </li>
            </ul>
          </div>
        </OpPanel>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-xl-6">
        <OpPanel
          title="Аналитика"
          caption="Графики, фильтры, memoization, SLA-конфиг и сохранение состояния фильтров."
        >
          <div class="about-page__content">
            <ul class="about-page__list">
              <li>
                Аналитика строится поверх общего списка тикетов и отдельного SLA-конфига, который
                приходит с backend, а не захардкожен на фронте.
              </li>
              <li>
                Фильтры сохраняются в URL query и sessionStorage. Это даёт полезный UX: фильтры
                переживают reload, а ссылку можно передать другому пользователю.
              </li>
              <li>
                useMemoizedAnalytics кеширует результаты вычислений в Map и предотвращает лишние
                пересчёты snapshot’ов при одинаковом наборе исходных данных и фильтров.
              </li>
              <li>
                Для графиков используется Chart.js. Регистрация модулей вынесена отдельно, чтобы
                remote одинаково работал и standalone, и через federation.
              </li>
              <li>В аналитике используется распределение по ролям исполнителей.</li>
            </ul>
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-xl-6">
        <OpPanel
          title="Уведомления, PWA и Service Worker"
          caption="Push API, Workbox, подписка браузера, runtime cache и системные уведомления."
        >
          <div class="about-page__content">
            <ul class="about-page__list">
              <li>
                Service Worker живёт на стороне host и собирается через @vite-pwa/nuxt в режиме
                injectManifest. Это важно, потому что именно host владеет shell, PWA и глобальными
                маршрутами.
              </li>
              <li>
                Workbox precache’ит собранные ассеты, а runtime cache держит remote assets и часть
                GET API для офлайн-переходов и повторных открытий.
              </li>
              <li>
                Push-подписка хранится на сервере в push_subscriptions. После подписки браузер
                получает endpoint, backend сохраняет его, а Service Worker показывает уведомление
                через showNotification.
              </li>
              <li>
                Реальные push-уведомления приходят по событиям тикетов, а локальные Quasar-toasts в
                ряде сценариев дублируются системным уведомлением, если у пользователя есть активная
                браузерная подписка.
              </li>
              <li>
                В dev PWA намеренно отключена: реальный offline-flow и push нужно тестировать через
                build/preview, иначе dev server начинает мешать честной офлайн-проверке.
              </li>
            </ul>
          </div>
        </OpPanel>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-xl-6">
        <OpPanel
          title="Профиль, роли, права и feature flags"
          caption="RBAC, route guard’ы, настройки пользователей и выборочное включение функционала."
        >
          <div class="about-page__content">
            <ul class="about-page__list">
              <li>
                В проекте есть три роли: admin, agent и employee. Роль влияет и на UI, и на API.
              </li>
              <li>
                Route middleware на host не даёт открыть аналитику или другие закрытые разделы без
                нужных прав и при необходимости перенаправляет на профиль.
              </li>
              <li>
                Feature flags реализованы per-user. Сейчас используется флаг «Новая таблица
                тикетов», который админ может включить конкретному пользователю через меню в таблице
                пользователей.
              </li>
              <li>
                Настройки доступа и SLA не используют websocket, но автообновляются по фокусу,
                visibilitychange и таймеру, как «лёгкий realtime» без лишней сложности.
              </li>
            </ul>
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-xl-6">
        <OpPanel
          title="Безопасность"
          caption="JWT, HttpOnly refresh cookie, CSRF, Helmet, CORS, rate limiting и разграничение прав."
        >
          <div class="about-page__content">
            <ul class="about-page__list">
              <li>
                Access token — это JWT, который живёт только в памяти клиентского store и не
                записывается в localStorage.
              </li>
              <li>
                Refresh token хранится в HttpOnly cookie на /auth. Это снижает риск прямого доступа
                к refresh-токену из JavaScript.
              </li>
              <li>
                Для state-changing запросов используется CSRF-схема double submit: backend выдаёт
                csrf_token cookie, а клиент отправляет его обратно в x-csrf-token.
              </li>
              <li>
                Backend включает Helmet и express-rate-limit, плюс CORS настроен явно. Это базовый,
                но правильный security baseline для такого проекта.
              </li>
              <li>
                Write-операции в KB, tickets, push и admin settings дополнительно защищены не только
                UI-проверками, но и серверными RBAC-правилами.
              </li>
              <li>
                Для KB есть отдельный server-side слой sanitization/XSS-фильтрации: slug, заголовок
                и контент нормализуются, а опасные HTML-теги, inline-обработчики и
                javascript:-payloads отклоняются ещё до записи в БД.
              </li>
            </ul>
          </div>
        </OpPanel>
      </div>
    </div>

    <OpPanel
      title="Кэширование и хранение данных"
      caption="Где используются IndexedDB, Memory cache, cookies, Cache Storage и SessionStorage."
    >
      <div class="row q-col-gutter-md">
        <div v-for="card in storageCards" :key="card.title" class="col-12 col-md-6 col-xl-4">
          <div class="about-page__mini-card">
            <div class="about-page__mini-title">
              {{ card.title }}
            </div>
            <div class="about-page__mini-caption">
              {{ card.caption }}
            </div>
          </div>
        </div>
      </div>
    </OpPanel>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-xl-6">
        <OpPanel
          title="SSR, ClientOnly и границы между сервером и клиентом"
          caption="Зачем в проекте одновременно есть SSR-оболочка и client-loaded remotes."
        >
          <div class="about-page__content">
            <ul class="about-page__list">
              <li>
                Host на Nuxt рендерится как SSR-оболочка: это даёт нормальный entry-point, layout,
                навигацию и платформенные возможности вроде PWA и head management.
              </li>
              <li>
                При этом некоторые страницы и layout оборачиваются в ClientOnly, потому что им нужны
                browser-only APIs: Notification, Service Worker, navigator.onLine, dynamic Quasar
                ids и подобные вещи, которые неудобно и рискованно тащить в SSR-гидрацию.
              </li>
              <li>
                Remotes загружаются клиентски через Module Federation. Это сознательная граница:
                доменные модули развиваются отдельно, но собираются в единое shell-приложение.
              </li>
              <li>
                Поэтому в проекте нет server components как отдельной технологии; вместо этого есть
                SSR host и client-only доменные границы там, где нужен браузерный runtime.
              </li>
            </ul>
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-xl-6">
        <OpPanel
          title="UI, адаптивность, a11y и стили"
          caption="Что делается поверх Quasar, как устроена тема и почему проект остаётся удобным на mobile/tablet/desktop."
        >
          <div class="about-page__content">
            <ul class="about-page__list">
              <li>
                Общий UI-слой вынесен в shared-ui. OpPageHeader и OpPanel дают более стабильную и
                предсказуемую структуру поверх Quasar, а BEM-классы вроде op-panel и op-page-header
                упрощают поддержку стилей.
              </li>
              <li>
                Адаптивность строится на Quasar grid и screen breakpoints: страницы нормально
                перестраиваются на desktop, tablet и mobile, а модальные окна и списки адаптируются
                под ширину экрана.
              </li>
              <li>
                Для a11y используются skip-link, aria-label, aria-live, focus management в диалогах
                и уважение к prefers-reduced-motion.
              </li>
              <li>
                Тёмная тема переключается глобально через Quasar Dark и store ui.darkMode, а
                выбранный режим сохраняется между сессиями через client-side persistence.
              </li>
              <li>
                Slots активно используются и на уровне собственных компонентов, и на уровне QTable —
                именно поэтому можно кастомно рисовать badge’и, действия, роли и статусы без
                переписывания таблиц с нуля.
              </li>
            </ul>
          </div>
        </OpPanel>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-xl-6">
        <OpPanel
          title="Patterns, composables и примеры инженерных решений"
          caption="Какие архитектурные и кодовые подходы реально применяются в проекте."
        >
          <div class="row q-col-gutter-sm">
            <div v-for="card in patterns" :key="card.title" class="col-12">
              <div class="about-page__mini-card">
                <div class="about-page__mini-title">
                  {{ card.title }}
                </div>
                <div class="about-page__mini-caption">
                  {{ card.caption }}
                </div>
              </div>
            </div>
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-xl-6">
        <OpPanel
          title="Activity feed и audit trail"
          caption="Кто что изменил и как это отображается на главной странице."
        >
          <div class="about-page__content">
            <ul class="about-page__list">
              <li>
                На backend есть таблица activity_events. В неё пишутся ключевые действия по тикетам
                и базе знаний: создание, обновление, смена статуса, назначение, удаление.
              </li>
              <li>
                Главная страница читает эти события и показывает их как «ленту последних действий».
              </li>
              <li>
                Это не full-blown immutable audit system для compliance, а лёгкий activity log /
                audit trail для продукта и админских сценариев.
              </li>
            </ul>
          </div>
        </OpPanel>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-page__content {
  display: grid;
  gap: 1rem;
}

.about-page__section-title {
  margin: 0;
  font-size: 1rem;
  line-height: 1.35;
}

.about-page__list {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.65rem;
  line-height: 1.55;
}

.about-page__item-caption {
  line-height: 1.45;
  white-space: normal;
}

.about-page__pages-list {
  overflow: hidden;
}

.about-page__page-item {
  --about-page-path-column: clamp(6.75rem, 18vw, 8.5rem);
}

.about-page__page-path {
  flex: 0 0 var(--about-page-path-column);
  min-width: var(--about-page-path-column);
  padding-right: 0.5rem;
}

.about-page__page-main {
  min-width: 0;
}

.about-page__mini-card {
  display: grid;
  gap: 0.45rem;
  height: 100%;
  padding: 1rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 16px;
  background: rgb(248 250 252);
}

.about-page__mini-title {
  font-weight: 600;
  line-height: 1.3;
}

.about-page__mini-caption {
  color: rgb(75 85 99);
  line-height: 1.5;
}

:deep(.body--dark) .about-page__mini-card,
:deep(.q-dark) .about-page__mini-card {
  background: rgb(31 41 55);
  border-color: rgb(55 65 81);
}

:deep(.body--dark) .about-page__mini-caption,
:deep(.q-dark) .about-page__mini-caption {
  color: rgb(209 213 219);
}
</style>
