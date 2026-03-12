import { onMounted, ref, shallowRef, version as vueVersion, type Component } from 'vue';

export type RemoteModule<T extends Component = Component> = {
  default: T;
};

type RemoteModuleFactoryResult<T extends Component = Component> = RemoteModule<T> | T;

type RemoteModuleFactory<T extends Component = Component> = () => RemoteModuleFactoryResult<T>;

type RemoteContainer = {
  get: <T extends Component = Component>(
    exposedModule: string,
  ) => Promise<RemoteModuleFactory<T>> | RemoteModuleFactory<T>;
  init?: (shareScope: RemoteShareScope) => Promise<void> | void;
};

type RemoteShareScope = Record<
  string,
  Record<
    string,
    {
      get: () => () => Promise<unknown>;
      loaded?: boolean;
      from?: string;
      scope?: string;
    }
  >
>;

export type UseRemoteModuleOptions = {
  entryUrl: string;
  exposedModule: string;
  timeoutMs?: number;
  errorMessage?: string;
};

const remoteContainerCache: Record<string, Promise<RemoteContainer>> = {};
const remoteStyleCache: Record<string, Promise<void>> = {};
const injectedRemoteStyles = new Set<string>();

const sharedVersions = {
  vue: vueVersion,
  pinia: '3.0.4',
  quasar: '2.18.6',
} as const;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  if (timeoutMs <= 0) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function isRemoteContainer(value: unknown): value is RemoteContainer {
  return (
    typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function'
  );
}

function normalizeRemoteModule<T extends Component = Component>(
  value: RemoteModuleFactoryResult<T>,
): RemoteModule<T> {
  if (typeof value === 'object' && value !== null && 'default' in value) {
    return value as RemoteModule<T>;
  }

  return {
    default: value as T,
  };
}

function createDefaultShareScope(): RemoteShareScope {
  return {
    vue: {
      [sharedVersions.vue]: {
        get: () => () => import('vue'),
        loaded: true,
        from: 'host-nuxt',
        scope: 'default',
      },
    },
    pinia: {
      [sharedVersions.pinia]: {
        get: () => () => import('pinia'),
        loaded: true,
        from: 'host-nuxt',
        scope: 'default',
      },
    },
    quasar: {
      [sharedVersions.quasar]: {
        get: () => () => import('quasar'),
        loaded: true,
        from: 'host-nuxt',
        scope: 'default',
      },
    },
  };
}

function extractRemoteStylePaths(remoteEntrySource: string): string[] {
  const matches = remoteEntrySource.matchAll(/["'`]([^"'`]+\.css)["'`]/g);
  const paths = new Set<string>();

  for (const match of matches) {
    const path = match[1];
    if (!path || path.startsWith('data:')) {
      continue;
    }

    paths.add(path);
  }

  return [...paths];
}

function hasStylesheetLink(href: string) {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).some(
    (link) => link.href === href,
  );
}

function ensureRemoteStyleLink(href: string): Promise<void> {
  if (injectedRemoteStyles.has(href) || hasStylesheetLink(href)) {
    injectedRemoteStyles.add(href);
    return Promise.resolve();
  }

  injectedRemoteStyles.add(href);

  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

async function ensureRemoteStyles(entryUrl: string) {
  if (remoteStyleCache[entryUrl]) {
    return remoteStyleCache[entryUrl];
  }

  remoteStyleCache[entryUrl] = fetch(entryUrl, {
    cache: 'no-cache',
  })
    .then(async (response) => {
      if (!response.ok) {
        return;
      }

      const source = await response.text();
      const stylePaths = extractRemoteStylePaths(source);

      await Promise.all(
        stylePaths.map((stylePath) => ensureRemoteStyleLink(new URL(stylePath, entryUrl).href)),
      );
    })
    .catch(() => {});

  return remoteStyleCache[entryUrl];
}

export async function loadRemoteContainerOnce(url: string, timeoutMs = 15000) {
  const absoluteUrl = new URL(url, window.location.href).href;

  if (remoteContainerCache[absoluteUrl]) {
    return remoteContainerCache[absoluteUrl];
  }

  remoteContainerCache[absoluteUrl] = withTimeout(
    ensureRemoteStyles(absoluteUrl).then(() =>
      import(/* @vite-ignore */ absoluteUrl).then(async (remoteContainer) => {
        if (!isRemoteContainer(remoteContainer)) {
          throw new Error(`Remote entry did not expose a valid container: ${absoluteUrl}`);
        }

        await remoteContainer.init?.(createDefaultShareScope());

        return remoteContainer;
      }),
    ),
    timeoutMs,
    `Loading timeout: ${absoluteUrl}`,
  ).catch((error) => {
    delete remoteContainerCache[absoluteUrl];
    throw error;
  });

  return remoteContainerCache[absoluteUrl];
}

export function useRemoteModule<T extends Component = Component>(options: UseRemoteModuleOptions) {
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
      const remoteContainer = await loadRemoteContainerOnce(options.entryUrl, options.timeoutMs);
      const remoteFactory = (await remoteContainer.get(
        options.exposedModule,
      )) as RemoteModuleFactory<T>;
      const remoteModule = normalizeRemoteModule<T>(await remoteFactory());

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
