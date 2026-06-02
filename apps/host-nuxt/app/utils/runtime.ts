import { useRuntimeConfig } from '#imports';

const DEFAULT_API_BASE_URL = 'http://localhost:3001';
const DEFAULT_TICKETS_REMOTE_ENTRY_URL = 'http://localhost:3010/remoteEntry.js';
const DEFAULT_KB_REMOTE_ENTRY_URL = 'http://localhost:3020/remoteEntry.js';
const DEFAULT_ANALYTICS_REMOTE_ENTRY_URL = 'http://localhost:3030/remoteEntry.js';

function normalizeRuntimeValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function useOpsHubRuntimeConfig() {
  const config = useRuntimeConfig();

  return {
    apiBaseUrl: normalizeRuntimeValue(config.public.apiBaseUrl, DEFAULT_API_BASE_URL),
    ticketsRemoteEntryUrl: normalizeRuntimeValue(
      config.public.ticketsRemoteEntryUrl,
      DEFAULT_TICKETS_REMOTE_ENTRY_URL,
    ),
    kbRemoteEntryUrl: normalizeRuntimeValue(
      config.public.kbRemoteEntryUrl,
      DEFAULT_KB_REMOTE_ENTRY_URL,
    ),
    analyticsRemoteEntryUrl: normalizeRuntimeValue(
      config.public.analyticsRemoteEntryUrl,
      DEFAULT_ANALYTICS_REMOTE_ENTRY_URL,
    ),
  };
}
