<script setup lang="ts">
import { navigateTo } from '#imports';
import { API_BASE_URL } from '@opshub/shared-config';
import { OpPageHeader, OpPanel, useReducedMotion } from '@opshub/shared-ui';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';

type ActivityFeedItem = {
  id: string;
  actorEmail: string;
  kind:
    | 'ticket_created'
    | 'ticket_status_changed'
    | 'ticket_assigned'
    | 'ticket_updated'
    | 'ticket_deleted'
    | 'kb_article_created'
    | 'kb_article_updated'
    | 'kb_article_deleted';
  title: string;
  description: string;
  resourceType: string;
  resourceId: string | null;
  resourcePath: string;
  createdAt: string;
};

type ActivityFeedCursor = {
  createdAt: string;
  id: string;
};

type ActivityFeedResponse = {
  items: ActivityFeedItem[];
  nextCursor: ActivityFeedCursor | null;
  hasMore: boolean;
};

type QuickAction = {
  title: string;
  caption: string;
  icon: string;
  to: string;
  color: string;
};

type GsapInstance = typeof import('gsap').gsap;

const ACTIVITY_FEED_PAGE_SIZE = 20;

const auth = useAuthStore();
const loading = ref(false);
const loadingMore = ref(false);
const error = ref<string | null>(null);
const loadMoreError = ref<string | null>(null);
const hasMore = ref(false);
const items = ref<ActivityFeedItem[]>([]);
const nextCursor = ref<ActivityFeedCursor | null>(null);
const pageRoot = ref<HTMLElement | null>(null);
const feedSentinel = ref<HTMLElement | null>(null);
const { reducedMotion } = useReducedMotion();
const activityIds = computed(() => items.value.map((item) => item.id));
const canObserveFeedSentinel = computed(
  () =>
    auth.isAuthenticated &&
    items.value.length > 0 &&
    hasMore.value &&
    !loading.value &&
    !loadingMore.value &&
    !loadMoreError.value,
);

let gsap: GsapInstance | null = null;
let introPlayed = false;
let feedObserver: IntersectionObserver | null = null;
let feedUpdateMode: 'replace' | 'append' = 'replace';

const quickActions = computed<QuickAction[]>(() => {
  const actions: QuickAction[] = [
    {
      title: 'Тикеты',
      caption: 'Создавайте, отслеживайте и меняйте статусы задач.',
      icon: 'confirmation_number',
      to: '/tickets',
      color: 'primary',
    },
    {
      title: 'База знаний',
      caption: 'Открывайте статьи и обновляйте материалы команды.',
      icon: 'menu_book',
      to: '/kb',
      color: 'secondary',
    },
    {
      title: 'Уведомления',
      caption: 'Управляйте подпиской на push-уведомления.',
      icon: 'notifications_active',
      to: '/notifications',
      color: 'positive',
    },
  ];

  if (auth.canViewAnalytics) {
    actions.splice(2, 0, {
      title: 'Аналитика',
      caption: 'Смотрите метрики SLA, статусы и динамику тикетов.',
      icon: 'query_stats',
      to: '/analytics',
      color: 'warning',
    });
  }

  return actions;
});

const dashboardTitle = computed(() =>
  auth.currentUser ? `Добро пожаловать, ${auth.currentUser.email}` : 'Добро пожаловать в OpsHub',
);

const dashboardCaption = computed(() =>
  auth.currentUser
    ? 'Последние действия в тикетах и базе знаний, а также быстрый доступ к основным модулям.'
    : 'Войдите в профиль, чтобы увидеть рабочий стол и историю событий.',
);

async function ensureGsap() {
  if (gsap || reducedMotion.value || typeof window === 'undefined') {
    return gsap;
  }

  const module = await import('gsap');
  gsap = module.gsap;
  return gsap;
}

async function animateDashboardIntro() {
  if (introPlayed || reducedMotion.value) {
    introPlayed = true;
    return;
  }

  await nextTick();

  const root = pageRoot.value;
  const gsapInstance = await ensureGsap();
  if (!root || !gsapInstance) {
    return;
  }

  const header = root.querySelectorAll('.op-page-header');
  const actionCards = root.querySelectorAll('.home-page__action-card');
  const feedPanel = root.querySelectorAll('.home-page__feed-panel');
  const feedItems = root.querySelectorAll('.home-page__feed-item');

  const timeline = gsapInstance.timeline({
    defaults: { duration: 0.38, ease: 'power2.out' },
  });

  if (header.length) {
    timeline.from(header, {
      y: 12,
      autoAlpha: 0,
      clearProps: 'transform,opacity,visibility',
    });
  }

  if (actionCards.length) {
    timeline.from(
      actionCards,
      {
        y: 18,
        autoAlpha: 0,
        stagger: 0.08,
        clearProps: 'transform,opacity,visibility',
      },
      header.length ? '-=0.16' : 0,
    );
  }

  if (feedPanel.length) {
    timeline.from(
      feedPanel,
      {
        y: 14,
        autoAlpha: 0,
        clearProps: 'transform,opacity,visibility',
      },
      actionCards.length ? '-=0.18' : 0,
    );
  }

  if (feedItems.length) {
    timeline.from(
      feedItems,
      {
        y: 10,
        autoAlpha: 0,
        duration: 0.28,
        stagger: 0.05,
        clearProps: 'transform,opacity,visibility',
      },
      '-=0.18',
    );
  }

  introPlayed = true;
}

async function animateFeedItems(nextIds: string[], previousIds: string[]) {
  if (reducedMotion.value || !nextIds.length) {
    return;
  }

  await nextTick();

  const root = pageRoot.value;
  const gsapInstance = await ensureGsap();
  if (!root || !gsapInstance) {
    return;
  }

  const feedItems = Array.from(root.querySelectorAll<HTMLElement>('.home-page__feed-item'));
  if (!feedItems.length) {
    return;
  }

  if (!previousIds.length) {
    gsapInstance.from(feedItems, {
      y: 10,
      autoAlpha: 0,
      duration: 0.28,
      stagger: 0.05,
      clearProps: 'transform,opacity,visibility',
    });
    return;
  }

  const newIds = new Set(nextIds.filter((id) => !previousIds.includes(id)));
  if (!newIds.size) {
    return;
  }

  const newItems = feedItems.filter((item) => {
    const itemId = item.dataset.activityId;
    return itemId ? newIds.has(itemId) : false;
  });

  if (!newItems.length) {
    return;
  }

  if (feedUpdateMode === 'append') {
    gsapInstance.from(newItems, {
      y: 14,
      autoAlpha: 0,
      duration: 0.3,
      stagger: 0.04,
      clearProps: 'transform,opacity,visibility',
    });
    return;
  }

  gsapInstance.fromTo(
    newItems,
    {
      y: -10,
      autoAlpha: 0,
      backgroundColor: 'rgb(25 118 210 / 0.14)',
    },
    {
      y: 0,
      autoAlpha: 1,
      backgroundColor: 'rgb(25 118 210 / 0)',
      duration: 0.42,
      stagger: 0.05,
      clearProps: 'transform,opacity,visibility,backgroundColor',
    },
  );
}

function iconForActivity(kind: ActivityFeedItem['kind']) {
  if (kind.startsWith('ticket')) {
    return 'confirmation_number';
  }

  return 'article';
}

function colorForActivity(kind: ActivityFeedItem['kind']) {
  if (kind === 'ticket_deleted' || kind === 'kb_article_deleted') {
    return 'negative';
  }

  if (kind === 'ticket_status_changed' || kind === 'ticket_assigned') {
    return 'warning';
  }

  if (kind === 'ticket_updated' || kind === 'kb_article_updated') {
    return 'secondary';
  }

  return 'positive';
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body === 'object' && 'message' in body) {
    return String(body.message);
  }

  return `HTTP ${res.status}`;
}

function disconnectFeedObserver() {
  feedObserver?.disconnect();
  feedObserver = null;
}

function updateFeedObserver() {
  disconnectFeedObserver();

  if (
    typeof window === 'undefined' ||
    !('IntersectionObserver' in window) ||
    !canObserveFeedSentinel.value ||
    !feedSentinel.value
  ) {
    return;
  }

  feedObserver = new window.IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      void loadActivityFeed({ append: true });
    },
    {
      rootMargin: '320px 0px',
    },
  );

  feedObserver.observe(feedSentinel.value);
}

function buildActivityFeedPath(cursor: ActivityFeedCursor | null) {
  const params = new URLSearchParams({
    limit: String(ACTIVITY_FEED_PAGE_SIZE),
  });

  if (cursor) {
    params.set('cursorCreatedAt', cursor.createdAt);
    params.set('cursorId', cursor.id);
  }

  return `/activity/feed?${params.toString()}`;
}

async function authorizedGet<T>(path: string): Promise<T> {
  async function attempt(token: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!res.ok) {
      throw Object.assign(new Error(await readError(res)), { status: res.status });
    }

    return res.json() as Promise<T>;
  }

  let token = auth.accessToken;
  if (!token) {
    token = (await auth.bootstrapAuth()) ?? '';
  }

  if (!token) {
    throw new Error('Войдите в систему, чтобы увидеть рабочий стол');
  }

  try {
    return await attempt(token);
  } catch (requestError) {
    const status =
      typeof requestError === 'object' && requestError !== null
        ? (requestError as { status?: number }).status
        : undefined;

    if (status !== 401) {
      throw requestError;
    }

    const refreshedToken = await auth.refreshAccessToken();
    if (!refreshedToken) {
      throw requestError;
    }

    return attempt(refreshedToken);
  }
}

async function loadActivityFeed(options: { append?: boolean } = {}) {
  const append = options.append === true;
  if (!auth.isAuthenticated) {
    items.value = [];
    error.value = null;
    loadMoreError.value = null;
    hasMore.value = false;
    nextCursor.value = null;
    return;
  }

  if (append) {
    if (loading.value || loadingMore.value || !hasMore.value || !nextCursor.value) {
      return;
    }

    loadingMore.value = true;
    loadMoreError.value = null;
  } else {
    loading.value = true;
    error.value = null;
    loadMoreError.value = null;
  }

  try {
    const response = await authorizedGet<ActivityFeedResponse>(
      buildActivityFeedPath(append ? nextCursor.value : null),
    );
    feedUpdateMode = append ? 'append' : 'replace';
    items.value = append ? [...items.value, ...response.items] : response.items;
    hasMore.value = response.hasMore;
    nextCursor.value = response.nextCursor;
  } catch (loadError) {
    const message =
      loadError instanceof Error ? loadError.message : 'Не удалось загрузить ленту событий';

    if (append) {
      loadMoreError.value = message;
      return;
    }

    error.value = message;
  } finally {
    if (append) {
      loadingMore.value = false;
    } else {
      loading.value = false;
    }
  }
}

onMounted(async () => {
  void animateDashboardIntro();
  await auth.bootstrapAuth();
  await loadActivityFeed();
});

watch(
  activityIds,
  (nextIds, previousIds) => {
    if (loading.value) {
      return;
    }

    void animateFeedItems(nextIds, previousIds);
  },
  { flush: 'post' },
);

watch(
  [feedSentinel, canObserveFeedSentinel],
  () => {
    updateFeedObserver();
  },
  { flush: 'post' },
);

onBeforeUnmount(() => {
  disconnectFeedObserver();

  if (!gsap || !pageRoot.value) {
    return;
  }

  gsap.killTweensOf(pageRoot.value.querySelectorAll('.home-page__action-card'));
  gsap.killTweensOf(pageRoot.value.querySelectorAll('.home-page__feed-panel'));
  gsap.killTweensOf(pageRoot.value.querySelectorAll('.home-page__feed-item'));
});
</script>

<template>
  <section ref="pageRoot" class="home-page op-page q-pa-md">
    <OpPageHeader :title="dashboardTitle" :caption="dashboardCaption" />

    <div class="row q-col-gutter-md q-mb-md">
      <div v-for="action in quickActions" :key="action.to" class="col-12 col-sm-6 col-xl-3">
        <q-card flat bordered class="home-page__action-card">
          <q-card-section class="row items-start no-wrap">
            <q-icon :name="action.icon" :color="action.color" size="2rem" class="q-mr-md" />
            <div class="col">
              <div class="text-subtitle1">
                {{ action.title }}
              </div>
              <div class="text-caption text-grey-7">
                {{ action.caption }}
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat :color="action.color" label="Открыть" @click="navigateTo(action.to)" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <OpPanel
      class="home-page__feed-panel"
      title="Лента последних событий"
      caption="Создание и обновление тикетов, назначения и изменения статей базы знаний."
    >
      <q-banner v-if="error" rounded class="bg-red-1 text-red-9 q-mb-md">
        {{ error }}
      </q-banner>

      <div v-if="loading" class="row items-center q-gutter-sm" aria-live="polite">
        <q-spinner color="primary" />
        <div>Загружаю последние события…</div>
      </div>

      <template v-else-if="items.length > 0">
        <q-list separator>
          <q-item
            v-for="item in items"
            :key="item.id"
            class="home-page__feed-item"
            clickable
            :data-activity-id="item.id"
            @click="navigateTo(item.resourcePath)"
          >
            <q-item-section avatar top>
              <q-icon :name="iconForActivity(item.kind)" :color="colorForActivity(item.kind)" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ item.title }}</q-item-label>
              <q-item-label caption class="q-mt-xs">
                {{ item.description }}
              </q-item-label>
              <q-item-label caption class="q-mt-xs">
                {{ formatDateTime(item.createdAt) }}
              </q-item-label>
            </q-item-section>

            <q-item-section side top>
              <q-badge :color="colorForActivity(item.kind)">
                {{ item.resourceType === 'ticket' ? 'Тикеты' : 'База знаний' }}
              </q-badge>
            </q-item-section>
          </q-item>
        </q-list>

        <div
          v-if="hasMore"
          ref="feedSentinel"
          class="home-page__feed-sentinel"
          aria-hidden="true"
        />

        <div
          v-if="loadingMore"
          class="home-page__feed-loading-more row items-center justify-center q-gutter-sm"
          aria-live="polite"
        >
          <q-spinner color="primary" />
          <div>Подгружаю ещё события…</div>
        </div>

        <q-banner
          v-else-if="loadMoreError"
          rounded
          class="home-page__feed-retry bg-orange-1 text-orange-9 q-mt-md"
        >
          {{ loadMoreError }}

          <template #action>
            <q-btn
              flat
              color="orange-9"
              label="Повторить"
              @click="loadActivityFeed({ append: true })"
            />
          </template>
        </q-banner>

        <div v-else-if="!hasMore" class="home-page__feed-end text-caption text-grey-6 q-mt-md">
          Это пока все события в истории.
        </div>
      </template>

      <q-banner v-else rounded class="bg-grey-1 text-grey-8">
        Событий пока нет. Создай тикет, измени статус, назначь исполнителя или обнови статью базы
        знаний, и они появятся здесь.
      </q-banner>
    </OpPanel>
  </section>
</template>

<style scoped>
.home-page__action-card {
  height: 100%;
}

.home-page__feed-sentinel {
  width: 100%;
  height: 1px;
}

.home-page__feed-loading-more {
  min-height: 3rem;
  margin-top: 0.75rem;
}

.home-page__feed-end {
  text-align: center;
}
</style>
