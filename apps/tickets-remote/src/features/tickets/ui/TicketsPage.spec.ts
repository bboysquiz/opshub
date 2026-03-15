import { flushPromises, shallowMount } from '@vue/test-utils';
import {
  createQuasarComponentStubs,
  createSlotStub,
} from '../../../../../../tests/mocks/componentStubs';

const {
  authStore,
  syncStore,
  ticketsStore,
  ticketsNotify,
  listAssignable,
  dialogCreate,
  quasarState,
} = vi.hoisted(() => ({
  authStore: {
    setCurrentUser: vi.fn(),
    bootstrapAuth: vi.fn().mockResolvedValue('token'),
  },
  syncStore: {
    conflictCount: 0,
    queueSize: 1,
    syncError: null as string | null,
    syncInProgress: false,
    syncProcessed: 0,
    syncRemaining: 0,
    syncTotal: 0,
    init: vi.fn().mockResolvedValue(undefined),
    retryAll: vi.fn().mockResolvedValue(undefined),
  },
  ticketsStore: {
    visibleTickets: [],
    loading: false,
    error: null as string | null,
    init: vi.fn().mockResolvedValue(undefined),
    loadTickets: vi.fn().mockResolvedValue(undefined),
    createTicket: vi.fn().mockResolvedValue(undefined),
    updateTicket: vi.fn().mockResolvedValue(true),
    removeTicket: vi.fn().mockResolvedValue(null),
  },
  ticketsNotify: {
    notifyConflictDetected: vi.fn(),
    notifySavedLocally: vi.fn(),
    notifySaveFailed: vi.fn(),
    notifySyncFailed: vi.fn(),
    notifyTicketRemoved: vi.fn(),
  },
  listAssignable: vi.fn().mockResolvedValue([
    {
      id: 'agent-1',
      email: 'agent@example.com',
      role: 'agent',
    },
  ]),
  dialogCreate: vi.fn(() => ({
    onOk: vi.fn(),
  })),
  quasarState: {
    screen: {
      lt: {
        md: false,
      },
    },
  },
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

vi.mock('../stores/sync', () => ({
  useSyncStore: () => syncStore,
}));

vi.mock('../stores/tickets', () => ({
  useTicketsStore: () => ticketsStore,
}));

vi.mock('../api/usersApi', () => ({
  usersApi: {
    listAssignable,
  },
}));

vi.mock('./useTicketsNotify', () => ({
  useTicketsNotify: () => ticketsNotify,
}));

vi.mock('quasar', async () => {
  return {
    ...createQuasarComponentStubs([
      'QBadge',
      'QBtn',
      'QCard',
      'QCardSection',
      'QDate',
      'QDialog',
      'QForm',
      'QIcon',
      'QInput',
      'QMenu',
      'QPopupProxy',
      'QSelect',
      'QTable',
      'QTd',
      'QTime',
    ]),
    useQuasar: () => quasarState,
    Dialog: {
      create: dialogCreate,
    },
  };
});

vi.mock('@opshub/shared-ui', async () => {
  const { ref } = await import('vue');

  return {
    OpPageHeader: createSlotStub('OpPageHeader'),
    useReducedMotion: () => ({
      reducedMotion: ref(true),
    }),
  };
});

import TicketsPage from './TicketsPage.vue';

describe('TicketsPage', () => {
  it('initializes stores and renders the tickets screen shell', async () => {
    const wrapper = shallowMount(TicketsPage, {
      props: {
        currentUserId: 'user-1',
        currentUserEmail: 'employee@example.com',
        userRole: 'admin',
        canUpdateTickets: true,
        canDeleteTickets: true,
        useNewTicketsTable: false,
      },
    });
    await flushPromises();

    expect(authStore.setCurrentUser).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'employee@example.com',
    });
    expect(syncStore.init).toHaveBeenCalledTimes(1);
    expect(ticketsStore.init).toHaveBeenCalledTimes(1);
    expect(ticketsStore.loadTickets).toHaveBeenCalledTimes(1);
    expect(listAssignable).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Тикеты');
    expect(syncStore.queueSize).toBe(1);
  });
});
