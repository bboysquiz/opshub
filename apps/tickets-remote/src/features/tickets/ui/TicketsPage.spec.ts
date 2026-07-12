import { flushPromises, shallowMount } from '@vue/test-utils';
import {
  createQuasarComponentStubs,
  createSlotStub,
} from '../../../../../../tests/mocks/componentStubs';
import type { LocalTicket, TicketPriority, TicketStatus } from '../domain/models';

const {
  authStore,
  syncStore,
  ticketsStore,
  ticketsNotify,
  listTicketProjects,
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
    visibleTickets: [] as LocalTicket[],
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
  listTicketProjects: vi.fn().mockResolvedValue([
    {
      projectId: 'project-1',
      projectName: 'Support',
      spaceId: 'space-1',
      spaceName: 'Ops',
    },
    {
      projectId: 'project-2',
      projectName: 'Payments',
      spaceId: 'space-2',
      spaceName: 'Billing',
    },
  ]),
  listAssignable: vi.fn().mockResolvedValue([
    {
      id: 'agent-1',
      email: 'agent@example.com',
      role: 'agent',
    },
    {
      id: 'agent-2',
      email: 'agent2@example.com',
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

vi.mock('../api/spacesApi', () => ({
  spacesApi: {
    listTicketProjects,
  },
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

type TicketsPageVm = {
  dialogOpen: boolean;
  detailsDialogOpen: boolean;
  form: {
    projectId: string;
    title: string;
    description: string;
    priority: TicketPriority;
    assignedTo: string | null;
    dueAt: string;
  };
  detailsForm: {
    projectId: string;
    title: string;
    description: string;
    priority: TicketPriority;
    status: TicketStatus;
    assignedTo: string | null;
    dueAt: string;
  };
  filters: {
    spaceId: string | null;
    projectId: string | null;
  };
  columns: Array<{ name: string }>;
  quickProjectFilterOptions: Array<{
    projectId: string;
    projectName: string;
    spaceId: string;
    spaceName: string;
    active: boolean;
    ticketCount: number;
  }>;
  quickProjectFilterAriaLabel: string;
  allProjectsShortcutLabel: string;
  allProjectsShortcutAriaLabel: string;
  projectShortcutAriaLabel: (projectName: string) => string;
  projectSelectOptions: Array<{
    label: string;
    value: string;
  }>;
  assignableUserOptions: Array<{
    label: string;
    value: string;
  }>;
  rows: LocalTicket[];
  setProjectFilter: (project: {
    projectId: string;
    projectName: string;
    spaceId: string;
    spaceName: string;
  }) => void;
  clearProjectFilter: () => void;
  openCreate: () => void;
  openView: (ticket: LocalTicket) => void;
  submit: () => Promise<void>;
  submitViewedTicket: () => Promise<void>;
  ticketProjectLabel: (ticket: Pick<LocalTicket, 'spaceName' | 'projectName'>) => string;
};

function createTicket(overrides: Partial<LocalTicket> = {}): LocalTicket {
  return {
    id: 'ticket-1',
    projectId: 'project-1',
    projectName: 'Support',
    spaceId: 'space-1',
    spaceName: 'Ops',
    title: 'Ticket',
    description: 'Description',
    status: 'open',
    priority: 'medium',
    createdBy: 'user-1',
    createdByEmail: 'creator@example.com',
    assignedTo: 'agent-1',
    assignedToEmail: 'agent@example.com',
    dueAt: null,
    updatedAt: '2025-01-02T10:00:00.000Z',
    createdAt: '2025-01-01T10:00:00.000Z',
    syncStatus: 'synced',
    isLocalOnly: false,
    isDeleted: false,
    baseUpdatedAt: '2025-01-02T10:00:00.000Z',
    lastError: null,
    conflict: false,
    ...overrides,
  };
}

function mountTicketsPage(
  props: Partial<{
    initialSpaceId: string | null;
    initialProjectId: string | null;
  }> = {},
) {
  return shallowMount(TicketsPage, {
    props: {
      currentUserId: 'user-1',
      currentUserEmail: 'employee@example.com',
      userRole: 'admin',
      canUpdateTickets: true,
      canDeleteTickets: true,
      useNewTicketsTable: false,
      ...props,
    },
  });
}

describe('TicketsPage', () => {
  beforeEach(() => {
    authStore.setCurrentUser.mockClear();
    authStore.bootstrapAuth.mockClear();
    authStore.bootstrapAuth.mockResolvedValue('token');
    syncStore.conflictCount = 0;
    syncStore.queueSize = 1;
    syncStore.syncError = null;
    syncStore.syncInProgress = false;
    syncStore.syncProcessed = 0;
    syncStore.syncRemaining = 0;
    syncStore.syncTotal = 0;
    syncStore.init.mockClear();
    syncStore.retryAll.mockClear();
    ticketsStore.visibleTickets = [];
    ticketsStore.loading = false;
    ticketsStore.error = null;
    ticketsStore.init.mockClear();
    ticketsStore.loadTickets.mockClear();
    ticketsStore.createTicket.mockClear();
    ticketsStore.createTicket.mockResolvedValue(undefined);
    ticketsStore.updateTicket.mockClear();
    ticketsStore.updateTicket.mockResolvedValue(true);
    ticketsStore.removeTicket.mockClear();
    ticketsNotify.notifyConflictDetected.mockClear();
    ticketsNotify.notifySavedLocally.mockClear();
    ticketsNotify.notifySaveFailed.mockClear();
    ticketsNotify.notifySyncFailed.mockClear();
    ticketsNotify.notifyTicketRemoved.mockClear();
    listTicketProjects.mockClear();
    listTicketProjects.mockResolvedValue([
      {
        projectId: 'project-1',
        projectName: 'Support',
        spaceId: 'space-1',
        spaceName: 'Ops',
      },
      {
        projectId: 'project-2',
        projectName: 'Payments',
        spaceId: 'space-2',
        spaceName: 'Billing',
      },
    ]);
    listAssignable.mockClear();
    listAssignable.mockResolvedValue([
      {
        id: 'agent-1',
        email: 'agent@example.com',
        role: 'agent',
      },
      {
        id: 'agent-2',
        email: 'agent2@example.com',
        role: 'agent',
      },
    ]);
    dialogCreate.mockClear();
  });

  it('initializes stores and renders the tickets screen shell', async () => {
    const wrapper = mountTicketsPage();
    await flushPromises();

    expect(authStore.setCurrentUser).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'employee@example.com',
    });
    expect(syncStore.init).toHaveBeenCalledTimes(1);
    expect(ticketsStore.init).toHaveBeenCalledTimes(1);
    expect(ticketsStore.loadTickets).toHaveBeenCalledTimes(1);
    expect(listTicketProjects).toHaveBeenCalledTimes(1);
    expect(listAssignable).toHaveBeenCalledWith({ projectId: 'project-1' });
    expect(listAssignable).not.toHaveBeenCalledWith();
    expect((wrapper.vm as unknown as TicketsPageVm).projectSelectOptions).toEqual([
      {
        label: 'Ops / Support',
        value: 'project-1',
      },
      {
        label: 'Billing / Payments',
        value: 'project-2',
      },
    ]);
    expect(wrapper.exists()).toBe(true);
    expect(syncStore.queueSize).toBe(1);
  });

  it('keeps the project route scoped to its project after filters are cleared', async () => {
    ticketsStore.visibleTickets = [
      createTicket({ id: 'ticket-1', projectId: 'project-1', spaceId: 'space-1' }),
      createTicket({ id: 'ticket-2', projectId: 'project-2', spaceId: 'space-2' }),
    ];

    const wrapper = mountTicketsPage({
      initialSpaceId: 'space-1',
      initialProjectId: 'project-1',
    });
    await flushPromises();

    const vm = wrapper.vm as unknown as TicketsPageVm;
    expect(vm.projectSelectOptions).toEqual([{ label: 'Ops / Support', value: 'project-1' }]);
    expect(vm.filters).toMatchObject({ spaceId: 'space-1', projectId: 'project-1' });
    expect(vm.rows.map((ticket) => ticket.id)).toEqual(['ticket-1']);

    vm.clearProjectFilter();
    expect(vm.rows.map((ticket) => ticket.id)).toEqual(['ticket-1']);
  });

  it('creates a ticket in the selected project and filters assignees by projectId', async () => {
    listAssignable.mockImplementation(async ({ projectId }: { projectId?: string } = {}) => {
      if (projectId === 'project-2') {
        return [
          {
            id: 'agent-2',
            email: 'agent2@example.com',
            role: 'agent',
          },
        ];
      }

      return [
        {
          id: 'agent-1',
          email: 'agent@example.com',
          role: 'agent',
        },
      ];
    });
    const wrapper = mountTicketsPage();
    await flushPromises();

    const vm = wrapper.vm as unknown as TicketsPageVm;
    vm.openCreate();
    expect(vm.dialogOpen).toBe(true);
    expect(vm.assignableUserOptions).toEqual([
      {
        label: 'agent@example.com (agent)',
        value: 'agent-1',
      },
    ]);

    vm.form.assignedTo = 'agent-1';
    vm.form.projectId = 'project-2';
    await flushPromises();
    expect(vm.form.assignedTo).toBeNull();
    expect(vm.assignableUserOptions).toEqual([
      {
        label: 'agent2@example.com (agent)',
        value: 'agent-2',
      },
    ]);

    vm.form.title = 'Payment incident';
    vm.form.description = 'Card payments are delayed';
    vm.form.priority = 'high';
    vm.form.assignedTo = 'agent-2';

    await vm.submit();

    expect(listAssignable).toHaveBeenCalledWith({ projectId: 'project-2' });
    expect(listAssignable).not.toHaveBeenCalledWith();
    expect(ticketsStore.createTicket).toHaveBeenCalledWith({
      projectId: 'project-2',
      projectName: 'Payments',
      spaceId: 'space-2',
      spaceName: 'Billing',
      title: 'Payment incident',
      description: 'Card payments are delayed',
      priority: 'high',
      assignedTo: 'agent-2',
      dueAt: null,
    });
    expect(ticketsNotify.notifySavedLocally).toHaveBeenCalledWith('created');
    expect(vm.dialogOpen).toBe(false);
  });

  it('updates ticket project from the details form and reloads assignees for that project', async () => {
    const ticket = createTicket();
    ticketsStore.visibleTickets = [ticket];

    const wrapper = mountTicketsPage();
    await flushPromises();

    const vm = wrapper.vm as unknown as TicketsPageVm;
    vm.openView(ticket);
    await flushPromises();
    expect(vm.detailsDialogOpen).toBe(true);
    vm.detailsForm.projectId = 'project-2';
    await flushPromises();
    vm.detailsForm.assignedTo = 'agent-2';

    await vm.submitViewedTicket();

    expect(listAssignable).toHaveBeenCalledWith({ projectId: 'project-2' });
    expect(ticketsStore.updateTicket).toHaveBeenCalledWith(
      'ticket-1',
      expect.objectContaining({
        projectId: 'project-2',
        projectName: 'Payments',
        spaceId: 'space-2',
        spaceName: 'Billing',
        assignedTo: 'agent-2',
      }),
    );
    expect(ticketsNotify.notifySavedLocally).toHaveBeenCalledWith('updated');
    expect(vm.detailsDialogOpen).toBe(false);
  });

  it('exposes project column data and detail label for tickets', async () => {
    const ticket = createTicket();
    ticketsStore.visibleTickets = [ticket];

    const wrapper = mountTicketsPage();
    await flushPromises();

    const vm = wrapper.vm as unknown as TicketsPageVm;

    expect(vm.columns.some((column) => column.name === 'project')).toBe(true);
    expect(vm.rows[0]).toMatchObject({
      projectId: 'project-1',
      projectName: 'Support',
      spaceId: 'space-1',
      spaceName: 'Ops',
    });
    expect(vm.ticketProjectLabel(ticket)).toBe('Ops / Support');
  });

  it('filters rows by accessible project shortcuts', async () => {
    const supportTicket = createTicket({
      id: 'ticket-1',
      projectId: 'project-1',
      projectName: 'Support',
      spaceId: 'space-1',
      spaceName: 'Ops',
    });
    const paymentsTicket = createTicket({
      id: 'ticket-2',
      projectId: 'project-2',
      projectName: 'Payments',
      spaceId: 'space-2',
      spaceName: 'Billing',
    });
    const inaccessibleProjectTicket = createTicket({
      id: 'ticket-3',
      projectId: 'project-3',
      projectName: 'Internal',
      spaceId: 'space-3',
      spaceName: 'Backoffice',
    });
    ticketsStore.visibleTickets = [supportTicket, paymentsTicket, inaccessibleProjectTicket];

    const wrapper = mountTicketsPage();
    await flushPromises();

    const vm = wrapper.vm as unknown as TicketsPageVm;

    expect(vm.quickProjectFilterOptions.map((project) => project.projectId)).toEqual([
      'project-1',
      'project-2',
    ]);
    expect(vm.quickProjectFilterOptions.map((project) => project.ticketCount)).toEqual([1, 1]);
    expect(vm.quickProjectFilterAriaLabel).toBe('Быстрый фильтр по проекту');
    expect(vm.allProjectsShortcutLabel).toBe('Все проекты');
    expect(vm.allProjectsShortcutAriaLabel).toBe('Показать тикеты всех доступных проектов');
    expect(vm.projectShortcutAriaLabel('Support')).toBe('Показать тикеты проекта Support');

    const paymentsShortcut = vm.quickProjectFilterOptions[1];
    if (!paymentsShortcut) {
      throw new Error('Expected payments project shortcut');
    }

    vm.setProjectFilter(paymentsShortcut);
    await flushPromises();

    expect(vm.filters).toMatchObject({
      spaceId: 'space-2',
      projectId: 'project-2',
    });
    expect(vm.rows.map((ticket) => ticket.id)).toEqual(['ticket-2']);

    vm.clearProjectFilter();
    await flushPromises();

    expect(vm.filters).toMatchObject({
      spaceId: null,
      projectId: null,
    });
    expect(vm.rows.map((ticket) => ticket.id)).toEqual(['ticket-1', 'ticket-2', 'ticket-3']);
  });
});
