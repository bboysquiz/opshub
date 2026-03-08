import { onMounted, ref, shallowRef, type Component } from 'vue';

declare global {
  interface Window {
    __opshubRemoteEntryLoaders__?: Record<string, Promise<void>>;
  }
}

export type RemoteModule<T extends Component = Component> = {
  default: T;
};

export type RemoteModuleLoader<T extends Component = Component> = () => Promise<RemoteModule<T>>;

export type UseRemoteModuleOptions<T extends Component = Component> = {
  entryUrl: string;
  loader: RemoteModuleLoader<T>;
  timeoutMs?: number;
  errorMessage?: string;
};

function getRemoteEntryCache() {
  if (!window.__opshubRemoteEntryLoaders__) {
    window.__opshubRemoteEntryLoaders__ = {};
  }

  return window.__opshubRemoteEntryLoaders__;
}

function getRemoteEntryScript(absoluteUrl: string) {
  return Array.from(document.scripts).find(
    (script) => script.dataset.remoteEntry === absoluteUrl || script.src === absoluteUrl,
  ) as HTMLScriptElement | undefined;
}

export async function loadRemoteEntryOnce(url: string, timeoutMs = 15_000) {
  const absoluteUrl = new URL(url, window.location.href).href;
  const cache = getRemoteEntryCache();

  if (cache[absoluteUrl]) {
    return cache[absoluteUrl];
  }

  cache[absoluteUrl] = new Promise<void>((resolve, reject) => {
    let isSettled = false;
    let timeoutId: number | undefined;

    const done = () => {
      if (isSettled) {
        return;
      }

      isSettled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      resolve();
    };

    const fail = (message?: string) => {
      if (isSettled) {
        return;
      }

      isSettled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      reject(new Error(message ?? `Failed to load ${absoluteUrl}`));
    };

    const existing = getRemoteEntryScript(absoluteUrl);

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        done();
        return;
      }

      existing.addEventListener('load', done, { once: true });
      existing.addEventListener('error', () => fail(), { once: true });
    } else {
      const script = document.createElement('script');
      script.src = absoluteUrl;
      script.type = 'text/javascript';
      script.async = true;
      script.dataset.remoteEntry = absoluteUrl;

      script.addEventListener(
        'load',
        () => {
          script.dataset.loaded = 'true';
          done();
        },
        { once: true },
      );

      script.addEventListener('error', () => fail(), { once: true });
      document.head.appendChild(script);
    }

    if (timeoutMs > 0) {
      timeoutId = window.setTimeout(() => {
        fail(`Loading timeout: ${absoluteUrl}`);
      }, timeoutMs);
    }
  }).catch((error) => {
    delete cache[absoluteUrl];
    throw error;
  });

  return cache[absoluteUrl];
}

export function useRemoteModule<T extends Component = Component>(
  options: UseRemoteModuleOptions<T>,
) {
  const component = shallowRef<T | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);
  let activeRequestId = 0;

  async function load() {
    if (import.meta.server) {
      return;
    }

    const requestId = ++activeRequestId;
    loading.value = true;
    error.value = null;

    try {
      await loadRemoteEntryOnce(options.entryUrl, options.timeoutMs);
      const remoteModule = await options.loader();

      if (requestId !== activeRequestId) {
        return;
      }

      component.value = remoteModule.default;
    } catch (loadError) {
      if (requestId !== activeRequestId) {
        return;
      }

      component.value = null;
      error.value =
        loadError instanceof Error
          ? loadError.message
          : (options.errorMessage ?? 'Failed to load remote module');
    } finally {
      if (requestId === activeRequestId) {
        loading.value = false;
      }
    }
  }

  onMounted(load);

  return {
    component,
    error,
    loading,
    reload: load,
  };
}
