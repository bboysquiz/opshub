import { flushPromises, shallowMount } from '@vue/test-utils';
import {
  createQuasarComponentStubs,
  createSlotStub,
} from '../../../../../../tests/mocks/componentStubs';

const { authStore, analyticsStore, persistAnalyticsFilters, restoreAnalyticsFilters, downloadCsv } =
  vi.hoisted(() => ({
    authStore: {
      bootstrapAuth: vi.fn().mockResolvedValue('token'),
    },
    analyticsStore: {
      availableTeams: ['support', 'operations'],
      error: null as string | null,
      filters: {
        dateFrom: '',
        dateTo: '',
        status: 'all',
        team: 'all',
      },
      loading: false,
      slaSettings: {
        lowMinutes: 1440,
        mediumMinutes: 480,
        highMinutes: 240,
        updatedAt: '',
      },
      tickets: [
        {
          id: 'ticket-1',
          title: 'Аналитический тикет',
          description: 'Описание',
          status: 'open',
          priority: 'high',
          createdAt: '2025-01-01T09:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          createdBy: 'user-1',
          createdByEmail: 'creator@example.com',
          createdByRole: 'employee',
          assignedTo: 'agent-1',
          assignedToEmail: 'agent@example.com',
          assignedToRole: 'agent',
          assignedTeam: 'support',
        },
      ],
      hydrateFilters: vi.fn(),
      loadTickets: vi.fn().mockResolvedValue(undefined),
      patchFilters: vi.fn(),
      resetFilters: vi.fn(),
    },
    persistAnalyticsFilters: vi.fn(),
    restoreAnalyticsFilters: vi.fn().mockReturnValue({
      dateFrom: '',
      dateTo: '',
      status: 'all',
      team: 'all',
    }),
    downloadCsv: vi.fn(),
  }));

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia');
  const { isRef, ref } = await import('vue');

  return {
    ...actual,
    storeToRefs: <T extends Record<string, unknown>>(store: T) =>
      Object.fromEntries(
        Object.entries(store).flatMap(([key, value]) =>
          typeof value === 'function' ? [] : [[key, isRef(value) ? value : ref(value)]],
        ),
      ),
  };
});

vi.mock('../../../stores/auth', () => ({
  useAuthStore: () => authStore,
}));

vi.mock('../stores/analytics', () => ({
  useAnalyticsStore: () => analyticsStore,
}));

vi.mock('../composables/useAnalyticsFiltersPersistence', () => ({
  persistAnalyticsFilters,
  restoreAnalyticsFilters,
}));

vi.mock('../utils/csv', () => ({
  downloadAnalyticsCsv: downloadCsv,
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

vi.mock('quasar', async () => ({
  ...createQuasarComponentStubs([
    'QBanner',
    'QBtn',
    'QDate',
    'QIcon',
    'QInput',
    'QPopupProxy',
    'QSelect',
    'QSeparator',
    'QSpinner',
    'QTable',
    'QTd',
  ]),
}));

import AnalyticsPage from './AnalyticsPage.vue';

describe('AnalyticsPage', () => {
  it('hydrates filters, loads data and renders the roles section', async () => {
    const wrapper = shallowMount(AnalyticsPage);
    await flushPromises();
    const setupState = (wrapper.vm as { $?: { setupState?: Record<string, unknown> } }).$
      ?.setupState;
    const columns = setupState?.columns as Array<{ label: string }> | undefined;

    expect(analyticsStore.hydrateFilters).toHaveBeenCalled();
    expect(analyticsStore.loadTickets).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Аналитика');
    expect(wrapper.text()).toContain('Распределение по ролям');
    expect(columns).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Роль исполнителя' })]),
    );
  });
});
