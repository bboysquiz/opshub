export default defineNuxtPlugin(() => {
  if (!import.meta.dev || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  void (async () => {
    const resetKey = '__opshub_dev_pwa_reset__';
    const registrations = await navigator.serviceWorker.getRegistrations();
    const hasController = Boolean(navigator.serviceWorker.controller);
    const hasRegistrations = registrations.length > 0;

    if (!hasController && !hasRegistrations) {
      window.sessionStorage.removeItem(resetKey);
      return;
    }

    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }

    if (window.sessionStorage.getItem(resetKey) === 'reloaded') {
      window.sessionStorage.removeItem(resetKey);
      return;
    }

    window.sessionStorage.setItem(resetKey, 'reloaded');
    window.location.replace(window.location.href);
  })();
});
