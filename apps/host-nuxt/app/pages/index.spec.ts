import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createSlotStub } from '../../../../tests/mocks/componentStubs';

const { authStore, navigateTo } = vi.hoisted(() => ({
  authStore: {
    currentUser: { email: 'agent@example.com' },
    isAuthenticated: true,
    canViewAnalytics: true,
    accessToken: 'token',
    bootstrapAuth: vi.fn().mockResolvedValue('token'),
    refreshAccessToken: vi.fn().mockResolvedValue('token'),
  },
  navigateTo: vi.fn(),
}));

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => authStore,
}));

vi.mock('#imports', () => ({
  navigateTo,
}));

vi.mock('@opshub/shared-ui', async () => {
  const { ref } = await import('vue');

  return {
    OpPageHeader: createSlotStub('OpPageHeader'),
    OpPanel: createSlotStub('OpPanel'),
    useReducedMotion: () => ({
      reducedMotion: ref(true),
    }),
  };
});

import IndexPage from './index.vue';

describe('home page activity feed', () => {
  it('loads the first page and appends more items when the sentinel intersects', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const payload = url.includes('cursorId=feed-2')
        ? {
            items: [
              {
                id: 'feed-3',
                actorEmail: 'agent@example.com',
                kind: 'kb_article_updated',
                title: 'Третье событие',
                description: 'Третий элемент ленты',
                resourceType: 'kb_article',
                resourceId: 'kb-1',
                resourcePath: '/kb',
                createdAt: '2025-01-03T10:00:00.000Z',
              },
            ],
            nextCursor: null,
            hasMore: false,
          }
        : {
            items: [
              {
                id: 'feed-1',
                actorEmail: 'agent@example.com',
                kind: 'ticket_created',
                title: 'Первое событие',
                description: 'Первый элемент ленты',
                resourceType: 'ticket',
                resourceId: 'ticket-1',
                resourcePath: '/tickets',
                createdAt: '2025-01-01T10:00:00.000Z',
              },
              {
                id: 'feed-2',
                actorEmail: 'agent@example.com',
                kind: 'ticket_updated',
                title: 'Второе событие',
                description: 'Второй элемент ленты',
                resourceType: 'ticket',
                resourceId: 'ticket-2',
                resourcePath: '/tickets',
                createdAt: '2025-01-02T10:00:00.000Z',
              },
            ],
            nextCursor: {
              createdAt: '2025-01-02T10:00:00.000Z',
              id: 'feed-2',
            },
            hasMore: true,
          };

      return Promise.resolve({
        ok: true,
        json: async () => payload,
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = mount(IndexPage);
    await flushPromises();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await flushPromises();
    await nextTick();
    const setupState = (wrapper.vm as { $?: { setupState?: Record<string, unknown> } }).$
      ?.setupState;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Лента последних событий');
    expect(setupState?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Первое событие' }),
        expect.objectContaining({ title: 'Второе событие' }),
      ]),
    );
    expect(setupState?.hasMore).toBe(true);

    await (setupState?.loadActivityFeed as (options?: { append?: boolean }) => Promise<void>)({
      append: true,
    });
    await flushPromises();
    await nextTick();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(setupState?.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Третье событие' })]),
    );
    expect(setupState?.hasMore).toBe(false);
  });
});
