import { useApiClient } from './useApiClient';

const { auth, fetchMock } = vi.hoisted(() => ({
  auth: {
    accessToken: 'access-token',
    ensureCsrfToken: vi.fn(),
    refreshAccessToken: vi.fn(),
  },
  fetchMock: vi.fn(),
}));

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => auth,
}));

vi.mock('~/utils/runtime', () => ({
  useOpsHubRuntimeConfig: () => ({
    apiBaseUrl: '/api',
  }),
}));

describe('useApiClient', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('converts a timed out request into a retryable API error', async () => {
    fetchMock.mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));

    await expect(useApiClient().apiRequest('/spaces')).rejects.toMatchObject({
      message: 'Сервер не ответил вовремя. Повторите запрос.',
      status: 408,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/spaces',
      expect.objectContaining({
        credentials: 'include',
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
