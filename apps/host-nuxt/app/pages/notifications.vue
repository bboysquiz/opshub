<script setup lang="ts">
import { API_BASE_URL } from '@opshub/shared-config';
import { notifyWithPush } from '@opshub/shared-ui';
import { useQuasar } from 'quasar';
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '~/stores/auth';

type BrowserNotificationPermission = 'default' | 'denied' | 'granted';
type PushRequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type PushConfig = {
  supported: boolean;
  publicKey: string;
  subscriptionCount: number;
};

const $q = useQuasar();
const auth = useAuthStore();

const loading = ref(true);
const subscribing = ref(false);
const error = ref<string | null>(null);
const config = ref<PushConfig | null>(null);
const permission = ref<BrowserNotificationPermission>('default');
const subscribedEndpoint = ref<string | null>(null);
const swReady = ref(false);

const isSupported = computed(
  () =>
    import.meta.client &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window,
);

const isSubscribed = computed(() => Boolean(subscribedEndpoint.value));

function permissionLabel(value: BrowserNotificationPermission) {
  if (value === 'granted') {
    return 'разрешены';
  }

  if (value === 'denied') {
    return 'запрещены';
  }

  return 'не запрошены';
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function readError(res: Response) {
  const body = await res.json().catch(() => null);
  if (body && typeof body === 'object' && 'message' in body) {
    return String(body.message);
  }

  return `HTTP ${res.status}`;
}

async function request<T>(path: string, init: PushRequestInit = {}, withCsrf = false): Promise<T> {
  async function attempt(token: string): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);

    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (withCsrf) {
      headers.set('x-csrf-token', await auth.ensureCsrfToken());
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      throw Object.assign(new Error(await readError(res)), { status: res.status });
    }

    return res.json() as Promise<T>;
  }

  let token = auth.accessToken;
  if (!token) {
    token = (await auth.refreshAccessToken()) ?? '';
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

async function getServiceWorkerRegistration() {
  if (!isSupported.value) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  swReady.value = Boolean(registration);
  return registration;
}

async function refreshSubscriptionState() {
  if (!isSupported.value) {
    return;
  }

  permission.value = Notification.permission;

  const registration = await getServiceWorkerRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  subscribedEndpoint.value = subscription?.endpoint ?? null;
}

async function loadConfig() {
  if (!auth.isAuthenticated || !isSupported.value) {
    return;
  }

  config.value = await request<PushConfig>('/push/config');
}

async function refreshPageState() {
  loading.value = true;
  error.value = null;

  try {
    await auth.bootstrapAuth();
    await refreshSubscriptionState();
    await loadConfig();
  } catch (loadError) {
    error.value =
      loadError instanceof Error ? loadError.message : 'Не удалось загрузить настройки уведомлений';
  } finally {
    loading.value = false;
  }
}

async function subscribe() {
  if (!isSupported.value) {
    error.value = 'Браузер не поддерживает Push API';
    return;
  }

  subscribing.value = true;
  error.value = null;

  try {
    let nextPermission = Notification.permission;
    if (nextPermission !== 'granted') {
      nextPermission = await Notification.requestPermission();
    }

    permission.value = nextPermission;
    if (nextPermission !== 'granted') {
      throw new Error('Браузер не выдал разрешение на уведомления');
    }

    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      throw new Error(
        'Service Worker не зарегистрирован. В dev-режиме push нужно тестировать через build/preview.',
      );
    }

    const pushConfig = config.value ?? (await request<PushConfig>('/push/config'));
    config.value = pushConfig;

    const currentSubscription = await registration.pushManager.getSubscription();
    const subscription =
      currentSubscription ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushConfig.publicKey),
      }));

    await request<PushConfig>(
      '/push/subscribe',
      {
        method: 'POST',
        body: JSON.stringify(subscription.toJSON()),
      },
      true,
    );

    await refreshPageState();

    notifyWithPush($q, {
      type: 'positive',
      message: 'Push-уведомления включены',
      pushTitle: 'Уведомления',
      pushTag: `notifications-subscribed-${Date.now()}`,
    });
  } catch (subscribeError) {
    error.value =
      subscribeError instanceof Error ? subscribeError.message : 'Не удалось включить уведомления';
  } finally {
    subscribing.value = false;
  }
}

async function unsubscribe() {
  if (!isSupported.value) {
    return;
  }

  subscribing.value = true;
  error.value = null;

  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration?.pushManager.getSubscription();

    if (subscription?.endpoint) {
      await request<PushConfig>(
        '/push/unsubscribe',
        {
          method: 'POST',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        },
        true,
      );

      await subscription.unsubscribe();
    }

    await refreshPageState();

    notifyWithPush($q, {
      type: 'positive',
      message: 'Push-уведомления отключены',
      pushTitle: 'Уведомления',
      pushTag: `notifications-unsubscribed-${Date.now()}`,
    });
  } catch (unsubscribeError) {
    error.value =
      unsubscribeError instanceof Error
        ? unsubscribeError.message
        : 'Не удалось отключить уведомления';
  } finally {
    subscribing.value = false;
  }
}

onMounted(async () => {
  await refreshPageState();
});
</script>

<template>
  <ClientOnly>
    <div class="q-gutter-y-md">
      <div class="text-h5">Уведомления</div>

      <q-banner v-if="error" rounded class="bg-red-1 text-red-9">
        {{ error }}
      </q-banner>

      <q-banner
        v-if="isSupported && permission === 'denied'"
        rounded
        class="bg-orange-1 text-orange-9"
      >
        Уведомления заблокированы браузером. Разреши их в настройках сайта и подпишись заново.
      </q-banner>

      <q-card v-if="loading" flat bordered>
        <q-card-section class="row items-center q-gutter-sm">
          <q-spinner />
          <div>Загружаю настройки push-уведомлений…</div>
        </q-card-section>
      </q-card>

      <template v-else>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-xl-7">
            <q-card flat bordered>
              <q-card-section class="row items-center">
                <div>
                  <div class="text-h6">Подписка браузера</div>
                  <div class="text-caption text-grey-7">
                    Service Worker: {{ swReady ? 'готов' : 'ожидание регистрации' }}
                  </div>
                </div>
              </q-card-section>

              <q-separator />

              <q-card-section class="q-gutter-y-sm">
                <div class="text-body2">
                  Разрешение браузера:
                  <strong>{{ permissionLabel(permission) }}</strong>
                </div>
                <q-banner rounded class="bg-blue-1 text-blue-9">
                  Чтобы push-уведомления показывались, проверь три условия: для сайта
                  `localhost:3000` в браузере должны быть разрешены уведомления, в настройках
                  операционной системы должны быть включены уведомления для браузера, а после
                  изменения этих настроек страницу лучше перезагрузить и подписаться заново.
                </q-banner>
              </q-card-section>

              <q-separator />

              <q-card-section class="row q-gutter-sm">
                <q-btn
                  color="primary"
                  icon="notifications_active"
                  label="Подписаться"
                  :loading="subscribing"
                  :disable="!isSupported || isSubscribed"
                  @click="subscribe"
                />
                <q-btn
                  flat
                  color="negative"
                  icon="notifications_off"
                  label="Отписаться"
                  :loading="subscribing"
                  :disable="!isSubscribed"
                  @click="unsubscribe"
                />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </template>
    </div>

    <template #fallback>
      <q-card flat bordered>
        <q-card-section class="row items-center q-gutter-sm">
          <q-spinner />
          <div>Подключаю Notifications…</div>
        </q-card-section>
      </q-card>
    </template>
  </ClientOnly>
</template>
