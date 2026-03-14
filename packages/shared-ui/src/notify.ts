import type { QNotifyCreateOptions, QVueGlobals } from 'quasar';

export type NotifyWithPushOptions = QNotifyCreateOptions & {
  pushTitle?: string;
  pushBody?: string;
  pushTag?: string;
};

async function maybeShowSystemNotification(options: NotifyWithPushOptions) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration || !('pushManager' in registration)) {
    return;
  }

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return;
  }

  const body =
    typeof options.pushBody === 'string'
      ? options.pushBody
      : typeof options.message === 'string'
        ? options.message
        : '';

  if (!body) {
    return;
  }

  const title =
    typeof options.pushTitle === 'string'
      ? options.pushTitle
      : typeof options.caption === 'string' && options.caption
        ? options.caption
        : 'OpsHub';

  await registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: options.pushTag ?? `toast-${Date.now()}`,
    data: {
      url: window.location.pathname + window.location.search + window.location.hash,
    },
  });
}

export function notifyWithPush($q: QVueGlobals, options: NotifyWithPushOptions) {
  $q.notify(options);
  void maybeShowSystemNotification(options).catch(() => undefined);
}
