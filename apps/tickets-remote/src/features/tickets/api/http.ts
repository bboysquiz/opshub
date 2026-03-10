import { useAuthStore } from '../../../stores/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

function getCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

function isWriteMethod(method: string) {
  return ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);

  if (body && typeof body === 'object' && 'message' in body) {
    return String(body.message);
  }

  const text = await res.text().catch(() => '');
  return text || `HTTP ${res.status}`;
}

async function ensureCsrfToken(): Promise<string> {
  const existing = getCookie('csrf_token');
  if (existing) return existing;

  const res = await fetch(`${API_BASE_URL}/csrf`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  const token = getCookie('csrf_token');
  if (!token) {
    throw new Error('После запроса /csrf CSRF-токен не найден');
  }

  return token;
}

async function send<T>(path: string, init: RequestInit, accessToken: string): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (isWriteMethod(method)) {
    headers.set('x-csrf-token', await ensureCsrfToken());
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    throw Object.assign(new Error(await readError(res)), { status: res.status });
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = useAuthStore();

  try {
    return await send<T>(path, init, auth.accessToken);
  } catch (error) {
    const status =
      typeof error === 'object' && error !== null
        ? (error as { status?: number }).status
        : undefined;

    if (status !== 401) {
      throw error;
    }

    const refreshedToken = await auth.refreshAccessToken();
    if (!refreshedToken) {
      throw error;
    }

    return send<T>(path, init, refreshedToken);
  }
}
