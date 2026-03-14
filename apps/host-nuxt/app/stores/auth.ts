import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { API_BASE_URL } from '@opshub/shared-config';
import {
  defaultSlaSettings,
  hasPermission,
  normalizeFeatureFlags,
  type AuthPermission,
  type AuthUser,
  type FeatureFlags,
  type SlaSettings,
  type UserRole,
} from '~/utils/access';

type AccessTokenResponse = {
  accessToken?: string;
};

type RegisterResponse = AccessTokenResponse;

type UsersResponse = {
  items: AuthUser[];
};

function getCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

function normalizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Не удалось выполнить запрос';
  }

  if (error.message === 'Unauthorized') {
    return 'Неверный email или пароль или сессия истекла';
  }

  if (error.message === 'Forbidden') {
    return 'Недостаточно прав для выполнения действия';
  }

  if (error.message === 'Email already exists') {
    return 'Пользователь с таким email уже существует';
  }

  if (error.message === 'Cannot remove the last admin') {
    return 'Нельзя снять роль у последнего администратора';
  }

  if (error.message === 'Failed to fetch') {
    return 'Не удалось подключиться к серверу';
  }

  if (error.message === 'Internal server error') {
    return 'Внутренняя ошибка сервера';
  }

  return error.message;
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);

  if (body && typeof body === 'object' && 'message' in body) {
    return String(body.message);
  }

  const text = await res.text().catch(() => '');
  return text || `HTTP ${res.status}`;
}

function normalizeUser(payload: Partial<AuthUser> & Record<string, unknown>): AuthUser {
  return {
    id: String(payload.id ?? ''),
    email: String(payload.email ?? ''),
    role: (payload.role as UserRole) ?? 'employee',
    createdAt: String(payload.createdAt ?? ''),
    featureFlags: normalizeFeatureFlags((payload.featureFlags as Partial<FeatureFlags>) ?? null),
  };
}

export const useAuthStore = defineStore('host-auth', () => {
  const accessToken = ref('');
  const currentUser = ref<AuthUser | null>(null);
  const users = ref<AuthUser[]>([]);
  const slaSettings = ref<SlaSettings>({ ...defaultSlaSettings });
  const usersLoading = ref(false);
  const usersError = ref<string | null>(null);
  const slaLoading = ref(false);
  const slaError = ref<string | null>(null);
  const bootstrapping = ref(false);
  const bootstrapComplete = ref(false);
  const bootstrapInFlight = ref<Promise<string | null> | null>(null);
  const refreshInFlight = ref<Promise<string | null> | null>(null);
  const authInFlight = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value && currentUser.value));
  const role = computed(() => currentUser.value?.role ?? null);
  const featureFlags = computed(() => normalizeFeatureFlags(currentUser.value?.featureFlags));
  const canViewAnalytics = computed(() => hasPermission(role.value, 'viewAnalytics'));
  const canManageUsers = computed(() => hasPermission(role.value, 'manageUsers'));
  const canUpdateTickets = computed(() => hasPermission(role.value, 'updateTicket'));
  const canDeleteTickets = computed(() => hasPermission(role.value, 'deleteTicket'));

  function can(permission: AuthPermission) {
    return hasPermission(role.value, permission);
  }

  function setAccessToken(token: string) {
    accessToken.value = token;
  }

  function clearSession() {
    accessToken.value = '';
    currentUser.value = null;
    users.value = [];
    usersError.value = null;
    slaSettings.value = { ...defaultSlaSettings };
    slaError.value = null;
  }

  async function ensureCsrfToken() {
    const existing = getCookie('csrf_token');
    if (existing) {
      return existing;
    }

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

  async function send<T>(
    path: string,
    init: RequestInit = {},
    token = accessToken.value,
  ): Promise<T> {
    const headers = new Headers(init.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
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

  async function authorizedSend<T>(path: string, init: RequestInit = {}): Promise<T> {
    try {
      return await send<T>(path, init, accessToken.value);
    } catch (error) {
      const status =
        typeof error === 'object' && error !== null
          ? (error as { status?: number }).status
          : undefined;

      if (status !== 401) {
        throw error;
      }

      const refreshedToken = await refreshAccessToken();
      if (!refreshedToken) {
        throw error;
      }

      return send<T>(path, init, refreshedToken);
    }
  }

  async function refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight.value) {
      return refreshInFlight.value;
    }

    refreshInFlight.value = (async () => {
      try {
        const csrf = await ensureCsrfToken();
        const data = await send<AccessTokenResponse>(
          '/auth/refresh',
          {
            method: 'POST',
            headers: {
              'x-csrf-token': csrf,
            },
          },
          '',
        );

        const token = data.accessToken ?? '';
        accessToken.value = token;

        return token || null;
      } catch {
        clearSession();
        return null;
      } finally {
        refreshInFlight.value = null;
      }
    })();

    return refreshInFlight.value;
  }

  async function loadCurrentUser(): Promise<AuthUser | null> {
    if (!accessToken.value) {
      currentUser.value = null;
      return null;
    }

    const data = await authorizedSend<AuthUser>('/me');
    const user = normalizeUser(data);
    currentUser.value = user;
    return user;
  }

  async function bootstrapAuth(): Promise<string | null> {
    if (accessToken.value && currentUser.value) {
      bootstrapComplete.value = true;
      return accessToken.value;
    }

    if (bootstrapComplete.value && !accessToken.value && !currentUser.value) {
      return null;
    }

    if (bootstrapInFlight.value) {
      return bootstrapInFlight.value;
    }

    bootstrapping.value = true;
    bootstrapInFlight.value = (async () => {
      try {
        const token = await refreshAccessToken();
        if (!token) {
          return null;
        }

        await loadCurrentUser();
        return token;
      } catch {
        clearSession();
        return null;
      } finally {
        bootstrapComplete.value = true;
        bootstrapping.value = false;
        bootstrapInFlight.value = null;
      }
    })();

    return bootstrapInFlight.value;
  }

  async function login(email: string, password: string): Promise<void> {
    authInFlight.value = true;

    try {
      const data = await send<AccessTokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      accessToken.value = data.accessToken ?? '';
      await loadCurrentUser();
      bootstrapComplete.value = true;
    } catch (error) {
      throw new Error(normalizeErrorMessage(error), {
        cause: error,
      });
    } finally {
      authInFlight.value = false;
    }
  }

  async function register(email: string, password: string): Promise<void> {
    authInFlight.value = true;

    try {
      const data = await send<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      accessToken.value = data.accessToken ?? '';
      await loadCurrentUser();
      bootstrapComplete.value = true;
    } catch (error) {
      throw new Error(normalizeErrorMessage(error), {
        cause: error,
      });
    } finally {
      authInFlight.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      const csrf = await ensureCsrfToken();
      await send<void>(
        '/auth/logout',
        {
          method: 'POST',
          headers: {
            'x-csrf-token': csrf,
          },
        },
        '',
      );
    } catch {
      // no-op
    } finally {
      clearSession();
      bootstrapComplete.value = true;
    }
  }

  async function loadUsers() {
    if (!canManageUsers.value) {
      users.value = [];
      return;
    }

    usersLoading.value = true;
    usersError.value = null;

    try {
      const data = await authorizedSend<UsersResponse>('/admin/users');
      users.value = data.items.map((item) => normalizeUser(item));
    } catch (error) {
      usersError.value = normalizeErrorMessage(error);
      throw new Error(usersError.value ?? 'Не удалось загрузить пользователей', {
        cause: error,
      });
    } finally {
      usersLoading.value = false;
    }
  }

  async function updateUserAccess(
    userId: string,
    patch: {
      role?: UserRole;
      featureFlags?: FeatureFlags;
    },
  ) {
    try {
      const updated = normalizeUser(
        await authorizedSend<AuthUser>(`/admin/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),
      );

      users.value = users.value.map((user) => (user.id === userId ? updated : user));

      if (currentUser.value?.id === userId) {
        currentUser.value = updated;
        if (!hasPermission(updated.role, 'manageUsers')) {
          users.value = [];
        }
      }

      return updated;
    } catch (error) {
      throw new Error(normalizeErrorMessage(error), {
        cause: error,
      });
    }
  }

  async function loadSlaSettings() {
    if (!canManageUsers.value) {
      slaSettings.value = { ...defaultSlaSettings };
      return;
    }

    slaLoading.value = true;
    slaError.value = null;

    try {
      slaSettings.value = await authorizedSend<SlaSettings>('/admin/sla-settings');
    } catch (error) {
      slaError.value = normalizeErrorMessage(error);
      throw new Error(slaError.value ?? 'Не удалось загрузить SLA', {
        cause: error,
      });
    } finally {
      slaLoading.value = false;
    }
  }

  async function updateSlaSettings(patch: {
    lowMinutes: number;
    mediumMinutes: number;
    highMinutes: number;
  }) {
    try {
      const updated = await authorizedSend<SlaSettings>('/admin/sla-settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });

      slaSettings.value = updated;
      return updated;
    } catch (error) {
      throw new Error(normalizeErrorMessage(error), {
        cause: error,
      });
    }
  }

  return {
    accessToken,
    currentUser,
    users,
    slaSettings,
    usersLoading,
    usersError,
    slaLoading,
    slaError,
    bootstrapping,
    bootstrapComplete,
    authInFlight,
    isAuthenticated,
    role,
    featureFlags,
    canViewAnalytics,
    canManageUsers,
    canUpdateTickets,
    canDeleteTickets,
    can,
    setAccessToken,
    clearSession,
    ensureCsrfToken,
    refreshAccessToken,
    loadCurrentUser,
    bootstrapAuth,
    login,
    register,
    logout,
    loadUsers,
    updateUserAccess,
    loadSlaSettings,
    updateSlaSettings,
  };
});
