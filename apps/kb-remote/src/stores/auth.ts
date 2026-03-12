import { defineStore } from 'pinia';
import { ref } from 'vue';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

function getCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
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
    throw new Error(`Не удалось получить CSRF-токен: HTTP ${res.status}`);
  }

  const token = getCookie('csrf_token');
  if (!token) {
    throw new Error('После запроса /csrf CSRF-токен не найден');
  }

  return token;
}

export const useAuthStore = defineStore('kb-auth', () => {
  const accessToken = ref('');
  const refreshInFlight = ref<Promise<string | null> | null>(null);
  const bootstrapComplete = ref(false);
  const bootstrapInFlight = ref<Promise<string | null> | null>(null);

  function clearAccessToken() {
    accessToken.value = '';
  }

  async function refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight.value) {
      return refreshInFlight.value;
    }

    refreshInFlight.value = (async () => {
      try {
        const csrf = await ensureCsrfToken();
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'x-csrf-token': csrf,
          },
        });

        if (!res.ok) {
          clearAccessToken();
          return null;
        }

        const data = (await res.json()) as { accessToken?: string };
        const nextToken = data.accessToken ?? '';
        accessToken.value = nextToken;
        return nextToken || null;
      } catch {
        clearAccessToken();
        return null;
      } finally {
        refreshInFlight.value = null;
      }
    })();

    return refreshInFlight.value;
  }

  async function bootstrapAuth(): Promise<string | null> {
    if (accessToken.value) {
      bootstrapComplete.value = true;
      return accessToken.value;
    }

    if (bootstrapComplete.value) {
      return null;
    }

    if (bootstrapInFlight.value) {
      return bootstrapInFlight.value;
    }

    bootstrapInFlight.value = (async () => {
      try {
        return await refreshAccessToken();
      } finally {
        bootstrapComplete.value = true;
        bootstrapInFlight.value = null;
      }
    })();

    return bootstrapInFlight.value;
  }

  return {
    accessToken,
    refreshAccessToken,
    bootstrapAuth,
  };
});
