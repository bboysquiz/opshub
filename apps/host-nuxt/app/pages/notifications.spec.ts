import { flushPromises, mount } from '@vue/test-utils';

const { authStore, notify } = vi.hoisted(() => ({
  authStore: {
    isAuthenticated: true,
    bootstrapAuth: vi.fn().mockResolvedValue('token'),
    refreshAccessToken: vi.fn().mockResolvedValue('token'),
    ensureCsrfToken: vi.fn().mockResolvedValue('csrf'),
    accessToken: 'token',
  },
  notify: vi.fn(),
}));

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => authStore,
}));

vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify,
  }),
}));

vi.mock('@opshub/shared-ui', () => ({
  notifyWithPush: vi.fn(),
}));

import NotificationsPage from './notifications.vue';

describe('notifications page', () => {
  it('renders without the role and support badges and boots auth once', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = mount(NotificationsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Уведомления');
    expect(wrapper.text()).not.toContain('Push API доступен');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(authStore.bootstrapAuth).toHaveBeenCalledTimes(1);
  });
});
