import { useAuthStore } from '~/stores/auth';
import { useOpsHubRuntimeConfig } from '~/utils/runtime';

export type ApiClientRequestOptions = {
  csrf?: boolean;
};

const API_TIMEOUT_MS = 15_000;

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function readApiError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');

  if (!text) {
    return `HTTP ${res.status}`;
  }

  try {
    const body = JSON.parse(text) as unknown;

    if (body && typeof body === 'object' && 'message' in body) {
      return String((body as { message: unknown }).message);
    }
  } catch {
    return text;
  }

  return text;
}

export function useApiClient() {
  const auth = useAuthStore();
  const { apiBaseUrl } = useOpsHubRuntimeConfig();

  async function send<T>(
    path: string,
    init: RequestInit = {},
    token = auth.accessToken,
    options: ApiClientRequestOptions = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (options.csrf) {
      headers.set('x-csrf-token', await auth.ensureCsrfToken());
    }

    let res: Response;

    try {
      res = await fetch(`${apiBaseUrl}${path}`, {
        ...init,
        headers,
        credentials: 'include',
        signal: init.signal ?? AbortSignal.timeout(API_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new ApiClientError('Сервер не ответил вовремя. Повторите запрос.', 408);
      }

      throw error;
    }

    if (!res.ok) {
      throw new ApiClientError(await readApiError(res), res.status);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }

  async function apiRequest<T>(
    path: string,
    init: RequestInit = {},
    options: ApiClientRequestOptions = {},
  ): Promise<T> {
    const token = auth.accessToken || ((await auth.refreshAccessToken()) ?? '');

    try {
      return await send<T>(path, init, token, options);
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 401) {
        throw error;
      }

      const refreshedToken = await auth.refreshAccessToken();
      if (!refreshedToken) {
        throw error;
      }

      return send<T>(path, init, refreshedToken, options);
    }
  }

  return {
    apiRequest,
  };
}
