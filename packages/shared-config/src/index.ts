export const APP_NAME = 'OpsHub';

const runtimeProcess = (
  globalThis as {
    process?: { env?: Record<string, string | undefined> };
  }
).process;

export const API_BASE_URL = runtimeProcess?.env?.API_BASE_URL ?? 'http://localhost:3001';
