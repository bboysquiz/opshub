<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { OpPageHeader, useReducedMotion } from '@opshub/shared-ui';
import {
  QBadge,
  QBtn,
  QCard,
  QCardSection,
  QDate,
  Dialog,
  QDialog,
  QForm,
  QIcon,
  QInput,
  QMenu,
  QPopupProxy,
  QSelect,
  QTable,
  QTd,
  QTime,
  useQuasar,
  type QTableColumn,
} from 'quasar';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { usersApi, type AssignableUser } from '../api/usersApi';
import { useSyncStore } from '../stores/sync';
import { useTicketsStore } from '../stores/tickets';
import type { LocalSyncStatus, LocalTicket, TicketPriority, TicketStatus } from '../domain/models';
import TicketsErrorState from './TicketsErrorState.vue';
import { useTicketsNotify } from './useTicketsNotify';

type TicketsPageProps = {
  userRole?: 'admin' | 'agent' | 'employee' | null;
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  canUpdateTickets?: boolean;
  canDeleteTickets?: boolean;
  useNewTicketsTable?: boolean;
};

const props = withDefaults(defineProps<TicketsPageProps>(), {
  userRole: null,
  currentUserId: null,
  currentUserEmail: null,
  canUpdateTickets: true,
  canDeleteTickets: true,
  useNewTicketsTable: false,
});

const {
  notifyConflictDetected,
  notifySavedLocally,
  notifySaveFailed,
  notifySyncFailed,
  notifyTicketRemoved,
} = useTicketsNotify();
const $q = useQuasar();
const { reducedMotion } = useReducedMotion();
const authStore = useAuthStore();
const ticketsStore = useTicketsStore();
const syncStore = useSyncStore();

const { visibleTickets, loading, error } = storeToRefs(ticketsStore);
const {
  conflictCount,
  queueSize,
  syncError,
  syncInProgress,
  syncProcessed,
  syncRemaining,
  syncTotal,
} = storeToRefs(syncStore);

const dialogOpen = ref(false);
const detailsDialogOpen = ref(false);
const viewingTicket = ref<LocalTicket | null>(null);
const assignableUsers = ref<AssignableUser[]>([]);
const createTicketButtonRef = ref<{ focus?: () => void; $el?: HTMLElement } | null>(null);
const lastFocusedElement = ref<HTMLElement | null>(null);
const updatedFromPopup = ref<{ hide?: () => void; show?: () => void } | null>(null);
const updatedToPopup = ref<{ hide?: () => void; show?: () => void } | null>(null);
const syncProgressVisible = ref(false);
const displayedSyncPercent = ref(0);
const displayedSyncProcessed = ref(0);
const displayedSyncRemaining = ref(0);

let syncProgressFrameId: number | null = null;
let syncProgressHideTimerId: number | null = null;

const filters = reactive({
  title: '',
  priority: null as TicketPriority | null,
  status: null as TicketStatus | null,
  assignedTo: null as string | '__unassigned__' | null,
  syncStatus: null as LocalSyncStatus | null,
  updatedFrom: '',
  updatedTo: '',
  createdAt: '',
});

const pagination = ref({
  sortBy: 'updatedAt',
  descending: true,
  rowsPerPage: props.useNewTicketsTable ? 0 : 10,
});

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const statusLabels: Record<TicketStatus, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  resolved: 'Решён',
};

const syncLabels: Record<LocalTicket['syncStatus'], string> = {
  synced: 'Синхронизирован',
  queued: 'В очереди',
  syncing: 'Синхронизируется',
  error: 'Ошибка',
  conflict: 'Конфликт',
};

const syncFilterOptions: Array<{ label: string; value: LocalSyncStatus }> = [
  { label: 'Синхронизирован', value: 'synced' },
  { label: 'В очереди', value: 'queued' },
  { label: 'Синхронизируется', value: 'syncing' },
  { label: 'Ошибка', value: 'error' },
  { label: 'Конфликт', value: 'conflict' },
];

const form = reactive({
  title: '',
  description: '',
  priority: 'medium' as TicketPriority,
  assignedTo: null as string | null,
});

const detailsForm = reactive({
  title: '',
  description: '',
  priority: 'medium' as TicketPriority,
  status: 'open' as TicketStatus,
  assignedTo: null as string | null,
});

const assignableUserOptions = computed(() =>
  assignableUsers.value.map((user) => ({
    label: `${user.email} (${user.role})`,
    value: user.id,
  })),
);

const assigneeFilterOptions = computed(() => {
  const options = new Map<string, string>();
  let hasUnassigned = false;

  for (const ticket of visibleTickets.value) {
    if (!ticket.assignedTo) {
      hasUnassigned = true;
      continue;
    }

    options.set(ticket.assignedTo, assigneeLabel(ticket));
  }

  const mapped = [...options.entries()]
    .sort((left, right) => left[1].localeCompare(right[1], 'ru'))
    .map(([value, label]) => ({ label, value }));

  if (hasUnassigned) {
    mapped.unshift({ label: 'Не назначен', value: '__unassigned__' as const });
  }

  return mapped;
});

const columns = computed<QTableColumn<LocalTicket>[]>(() => {
  const base: QTableColumn<LocalTicket>[] = [
    {
      name: 'title',
      label: 'Заголовок',
      field: (row) => row.title.toLowerCase(),
      align: 'left',
      sortable: true,
    },
    {
      name: 'priority',
      label: 'Приоритет',
      field: (row) => ({ low: 1, medium: 2, high: 3 })[row.priority],
      align: 'left',
      sortable: true,
    },
    {
      name: 'status',
      label: 'Статус',
      field: (row) => ({ open: 1, in_progress: 2, resolved: 3 })[row.status],
      align: 'left',
      sortable: true,
    },
    {
      name: 'assignedTo',
      label: 'Назначен',
      field: (row) => assigneeLabel(row).toLowerCase(),
      align: 'left',
      sortable: true,
    },
    {
      name: 'sync',
      label: 'Синхронизация',
      field: (row) => ({ synced: 1, syncing: 2, queued: 3, error: 4, conflict: 5 })[row.syncStatus],
      align: 'left',
      sortable: true,
    },
    {
      name: 'updatedAt',
      label: 'Обновлён',
      field: (row) => row.updatedAt,
      align: 'left',
      sortable: true,
    },
  ];

  if (props.useNewTicketsTable) {
    base.splice(4, 0, {
      name: 'createdAt',
      label: 'Создан',
      field: (row) => row.createdAt,
      align: 'left',
      sortable: true,
    });
  }

  base.push({ name: 'actions', label: 'Действия', field: (row) => row.id, align: 'right' });

  return base;
});

const priorityOptions: Array<{ label: string; value: TicketPriority }> = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' },
];

const statusOptions: Array<{ label: string; value: TicketStatus }> = [
  { label: 'Открыт', value: 'open' },
  { label: 'В работе', value: 'in_progress' },
  { label: 'Решён', value: 'resolved' },
];

const rows = computed(() =>
  visibleTickets.value.filter((ticket) => {
    const titleFilter = filters.title.trim().toLowerCase();
    const createdAtFilter = filters.createdAt.trim().toLowerCase();
    const updatedFromTimestamp = parseDateTimeFilter(filters.updatedFrom, 'start');
    const updatedToTimestamp = parseDateTimeFilter(filters.updatedTo, 'end');
    const ticketUpdatedAt = new Date(ticket.updatedAt).getTime();

    if (
      titleFilter &&
      !ticket.title.toLowerCase().includes(titleFilter) &&
      !ticket.description.toLowerCase().includes(titleFilter)
    ) {
      return false;
    }

    if (filters.priority && ticket.priority !== filters.priority) {
      return false;
    }

    if (filters.status && ticket.status !== filters.status) {
      return false;
    }

    if (filters.assignedTo === '__unassigned__' && ticket.assignedTo) {
      return false;
    }

    if (
      filters.assignedTo &&
      filters.assignedTo !== '__unassigned__' &&
      ticket.assignedTo !== filters.assignedTo
    ) {
      return false;
    }

    if (filters.syncStatus && ticket.syncStatus !== filters.syncStatus) {
      return false;
    }

    if (updatedFromTimestamp !== null && ticketUpdatedAt < updatedFromTimestamp) {
      return false;
    }

    if (updatedToTimestamp !== null && ticketUpdatedAt > updatedToTimestamp) {
      return false;
    }

    if (
      props.useNewTicketsTable &&
      createdAtFilter &&
      !formatDateTime(ticket.createdAt).toLowerCase().includes(createdAtFilter)
    ) {
      return false;
    }

    return true;
  }),
);

const dialogTransition = computed(() => (reducedMotion.value ? 'fade' : 'scale'));
const canEditViewedTicket = computed(() =>
  viewingTicket.value ? canEditTicket(viewingTicket.value) : false,
);
const syncProgressTargetPercent = computed(() =>
  syncTotal.value > 0 ? (syncProcessed.value / syncTotal.value) * 100 : 0,
);
const syncProgressPercent = computed(() => Math.max(0, Math.min(100, displayedSyncPercent.value)));
const syncProgressProcessedLabel = computed(() =>
  Math.max(0, Math.min(syncTotal.value, Math.round(displayedSyncProcessed.value))),
);
const syncProgressRemainingLabel = computed(() =>
  Math.max(0, Math.round(displayedSyncRemaining.value)),
);
const syncProgressStateLabel = computed(() => {
  if (syncInProgress.value) {
    return 'Идёт синхронизация';
  }

  return syncError.value ? 'Синхронизация остановлена' : 'Синхронизация завершена';
});

function cancelSyncProgressFrame() {
  if (syncProgressFrameId === null || typeof window === 'undefined') {
    return;
  }

  window.cancelAnimationFrame(syncProgressFrameId);
  syncProgressFrameId = null;
}

function clearSyncProgressHideTimer() {
  if (syncProgressHideTimerId === null || typeof window === 'undefined') {
    return;
  }

  window.clearTimeout(syncProgressHideTimerId);
  syncProgressHideTimerId = null;
}

function setDisplayedSyncProgress(processed: number, remaining: number, percent: number) {
  displayedSyncProcessed.value = processed;
  displayedSyncRemaining.value = remaining;
  displayedSyncPercent.value = percent;
}

function resetDisplayedSyncProgress() {
  setDisplayedSyncProgress(0, 0, 0);
}

function scheduleSyncProgressHide() {
  if (syncInProgress.value || syncProgressHideTimerId !== null) {
    return;
  }

  if (typeof window === 'undefined') {
    syncProgressVisible.value = false;
    resetDisplayedSyncProgress();
    return;
  }

  syncProgressHideTimerId = window.setTimeout(() => {
    syncProgressVisible.value = false;
    resetDisplayedSyncProgress();
    syncProgressHideTimerId = null;
  }, 480);
}

function animateSyncProgressToTarget() {
  cancelSyncProgressFrame();

  const targetPercent = syncProgressTargetPercent.value;
  const targetProcessed = syncProcessed.value;
  const targetRemaining = syncRemaining.value;

  if (reducedMotion.value || typeof window === 'undefined') {
    setDisplayedSyncProgress(targetProcessed, targetRemaining, targetPercent);

    if (!syncInProgress.value) {
      scheduleSyncProgressHide();
    }

    return;
  }

  const step = () => {
    const percentDiff = targetPercent - displayedSyncPercent.value;
    const processedDiff = targetProcessed - displayedSyncProcessed.value;
    const remainingDiff = targetRemaining - displayedSyncRemaining.value;
    const settled =
      Math.abs(percentDiff) < 0.2 && Math.abs(processedDiff) < 0.2 && Math.abs(remainingDiff) < 0.2;

    if (settled) {
      setDisplayedSyncProgress(targetProcessed, targetRemaining, targetPercent);
      syncProgressFrameId = null;

      if (!syncInProgress.value) {
        scheduleSyncProgressHide();
      }

      return;
    }

    displayedSyncPercent.value += percentDiff * 0.18;
    displayedSyncProcessed.value += processedDiff * 0.24;
    displayedSyncRemaining.value += remainingDiff * 0.24;
    syncProgressFrameId = window.requestAnimationFrame(step);
  };

  syncProgressFrameId = window.requestAnimationFrame(step);
}

function parseDateTimeFilter(value: string, edge: 'start' | 'end' = 'start') {
  if (!value) {
    return null;
  }

  const parts = value.split(' ');
  const datePart = parts[0] ?? '';
  const timePart = parts[1] ?? (edge === 'end' ? '23:59' : '00:00');
  const [yearRaw = '', monthRaw = '', dayRaw = ''] = datePart.split('-');
  const [hoursRaw = '', minutesRaw = ''] = timePart.split(':');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    edge === 'end' ? 59 : 0,
    edge === 'end' ? 999 : 0,
  ).getTime();
}

function assigneeLabel(ticket: Pick<LocalTicket, 'assignedTo' | 'assignedToEmail'>) {
  if (!ticket.assignedTo) {
    return 'Не назначен';
  }

  const knownUser = assignableUsers.value.find((user) => user.id === ticket.assignedTo);
  return knownUser?.email ?? ticket.assignedToEmail ?? ticket.assignedTo;
}

function creatorLabel(ticket: Pick<LocalTicket, 'createdBy' | 'createdByEmail'>) {
  return ticket.createdByEmail ?? ticket.createdBy ?? 'Неизвестный пользователь';
}

function normalizeAssignedTo(value: string | null | undefined) {
  return value && value.trim() ? value : null;
}

function isOwner(ticket: LocalTicket) {
  return Boolean(props.currentUserId && ticket.createdBy === props.currentUserId);
}

function canEditTicket(ticket: LocalTicket) {
  return (
    ticket.isLocalOnly ||
    props.canUpdateTickets ||
    (props.userRole === 'employee' && isOwner(ticket))
  );
}

function canDeleteTicket(ticket: LocalTicket) {
  return (
    ticket.isLocalOnly ||
    props.canDeleteTickets ||
    ((props.userRole === 'employee' || props.userRole === 'agent') && isOwner(ticket))
  );
}

function statusColor(status: TicketStatus) {
  if (status === 'resolved') return 'positive';
  if (status === 'in_progress') return 'warning';
  return 'primary';
}

function syncColor(syncStatus: LocalTicket['syncStatus']) {
  if (syncStatus === 'synced') return 'positive';
  if (syncStatus === 'queued') return 'warning';
  if (syncStatus === 'conflict') return 'negative';
  if (syncStatus === 'error') return 'negative';
  return 'info';
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function priorityLabel(priority: TicketPriority) {
  return priorityLabels[priority];
}

function statusLabel(status: TicketStatus) {
  return statusLabels[status];
}

function syncLabel(syncStatus: LocalTicket['syncStatus']) {
  return syncLabels[syncStatus];
}

function resetForm() {
  form.title = '';
  form.description = '';
  form.priority = 'medium';
  form.assignedTo = null;
}

function resetDetailsForm(ticket: LocalTicket) {
  detailsForm.title = ticket.title;
  detailsForm.description = ticket.description;
  detailsForm.priority = ticket.priority;
  detailsForm.status = ticket.status;
  detailsForm.assignedTo = ticket.assignedTo;
}

function focusComponent(target: { focus?: () => void; $el?: HTMLElement } | null) {
  if (!target) {
    return;
  }

  if (typeof target.focus === 'function') {
    target.focus();
    return;
  }

  target.$el?.focus();
}

function openCreate() {
  lastFocusedElement.value =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  resetForm();
  dialogOpen.value = true;
}

function openView(ticket: LocalTicket) {
  lastFocusedElement.value =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  viewingTicket.value = ticket;
  resetDetailsForm(ticket);
  detailsDialogOpen.value = true;
}

function handleRowClick(_event: Event, row: LocalTicket) {
  openView(row);
}

async function loadAssignableUsers() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    assignableUsers.value = [];
    return;
  }

  try {
    assignableUsers.value = await usersApi.listAssignable();
  } catch {
    assignableUsers.value = [];
  }
}

async function submit() {
  try {
    await ticketsStore.createTicket({
      title: form.title,
      description: form.description,
      priority: form.priority,
      assignedTo: normalizeAssignedTo(form.assignedTo),
    });

    notifySavedLocally('created');
    dialogOpen.value = false;
  } catch (submitError) {
    notifySaveFailed(submitError);
  }
}

async function submitViewedTicket() {
  if (!viewingTicket.value) {
    return;
  }

  if (!canEditTicket(viewingTicket.value)) {
    notifySaveFailed(new Error('У текущей роли нет прав на изменение этого тикета'));
    return;
  }

  try {
    const patch: {
      title: string;
      description: string;
      priority: TicketPriority;
      status?: TicketStatus;
      assignedTo?: string | null;
    } = {
      title: detailsForm.title,
      description: detailsForm.description,
      priority: detailsForm.priority,
    };

    if (!viewingTicket.value.isLocalOnly) {
      patch.status = detailsForm.status;
    }

    if (props.canUpdateTickets) {
      patch.assignedTo = normalizeAssignedTo(detailsForm.assignedTo);
    }

    const updated = await ticketsStore.updateTicket(viewingTicket.value.id, patch);
    if (!updated) {
      return;
    }

    notifySavedLocally('updated');

    const updatedTicket =
      visibleTickets.value.find((ticket) => ticket.id === viewingTicket.value?.id) ?? null;

    if (updatedTicket) {
      viewingTicket.value = updatedTicket;
      resetDetailsForm(updatedTicket);
    }
  } catch (submitError) {
    notifySaveFailed(submitError);
  }
}

function confirmDelete(ticket: LocalTicket) {
  if (!canDeleteTicket(ticket)) {
    return;
  }

  Dialog.create({
    title: 'Удалить тикет',
    message: `Удалить «${ticket.title}»?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const result = await ticketsStore.removeTicket(ticket.id);
    if (result) {
      notifyTicketRemoved(result);
    }
  });
}

async function reload() {
  await ticketsStore.loadTickets(true);
}

async function retrySync() {
  await syncStore.retryAll();
}

function resetFilters() {
  filters.title = '';
  filters.priority = null;
  filters.status = null;
  filters.assignedTo = null;
  filters.syncStatus = null;
  filters.updatedFrom = '';
  filters.updatedTo = '';
  filters.createdAt = '';
}

watch(syncError, (message, previous) => {
  if (message && message !== previous) {
    notifySyncFailed(message);
  }
});

watch(conflictCount, (count, previous) => {
  if (count > 0 && count > previous) {
    notifyConflictDetected();
  }
});

watch(
  syncInProgress,
  (inProgress, wasInProgress) => {
    if (inProgress && !wasInProgress) {
      clearSyncProgressHideTimer();
      cancelSyncProgressFrame();

      if (syncTotal.value > 0) {
        syncProgressVisible.value = true;
        setDisplayedSyncProgress(0, syncTotal.value, 0);
        animateSyncProgressToTarget();
      }

      return;
    }

    if (!inProgress && wasInProgress && syncProgressVisible.value) {
      animateSyncProgressToTarget();
    }
  },
  { immediate: true },
);

watch(
  [syncTotal, syncProcessed, syncRemaining],
  ([total]) => {
    if (!total && !syncInProgress.value) {
      clearSyncProgressHideTimer();
      cancelSyncProgressFrame();
      syncProgressVisible.value = false;
      resetDisplayedSyncProgress();
      return;
    }

    if (total > 0 && (syncInProgress.value || syncProgressVisible.value)) {
      clearSyncProgressHideTimer();
      syncProgressVisible.value = true;
      animateSyncProgressToTarget();
    }
  },
  { immediate: true },
);

watch(dialogOpen, async (isOpen) => {
  if (isOpen) return;

  await nextTick();
  if (lastFocusedElement.value) {
    lastFocusedElement.value.focus();
    return;
  }

  focusComponent(createTicketButtonRef.value);
});

watch(detailsDialogOpen, async (isOpen) => {
  if (isOpen) {
    return;
  }

  await nextTick();
  lastFocusedElement.value?.focus();
});

watch(
  visibleTickets,
  (nextTickets) => {
    if (!viewingTicket.value) {
      return;
    }

    const updated = nextTickets.find((ticket) => ticket.id === viewingTicket.value?.id) ?? null;
    if (!updated) {
      detailsDialogOpen.value = false;
      viewingTicket.value = null;
      return;
    }

    viewingTicket.value = updated;
  },
  { deep: true },
);

onMounted(async () => {
  authStore.setCurrentUser({
    id: props.currentUserId,
    email: props.currentUserEmail,
  });
  await authStore.bootstrapAuth();
  await syncStore.init();
  await ticketsStore.init();
  await loadAssignableUsers();
  await ticketsStore.loadTickets();
});

onBeforeUnmount(() => {
  cancelSyncProgressFrame();
  clearSyncProgressHideTimer();
});
</script>

<template>
  <section class="q-pa-md op-page" aria-labelledby="tickets-page-title">
    <OpPageHeader id="tickets-page-title" title="Тикеты">
      <template #actions>
        <q-badge
          color="warning"
          class="q-px-sm q-py-xs"
          :class="{
            'tickets-page__status-badge--queue': !reducedMotion && queueSize > 0 && !syncInProgress,
          }"
          role="status"
        >
          очередь {{ queueSize }}
        </q-badge>

        <q-badge
          v-if="syncInProgress"
          color="info"
          class="q-px-sm q-py-xs"
          :class="{ 'tickets-page__status-badge--sync': !reducedMotion }"
          role="status"
        >
          идёт синхронизация
        </q-badge>

        <q-badge
          v-if="conflictCount"
          color="negative"
          class="q-px-sm q-py-xs"
          :class="{ 'tickets-page__status-badge--conflict': !reducedMotion }"
          role="status"
        >
          конфликты {{ conflictCount }}
        </q-badge>

        <q-badge v-if="props.useNewTicketsTable" color="secondary" class="q-px-sm q-py-xs">
          новая таблица
        </q-badge>

        <q-btn flat color="primary" label="Фильтры" aria-label="Показать или скрыть фильтры">
          <q-menu anchor="bottom right" self="top right" class="tickets-page__filters-menu">
            <q-card flat bordered class="tickets-page__filters-card">
              <q-card-section>
                <div class="row items-center q-col-gutter-md q-row-gutter-md">
                  <div class="col-12 col-md-3">
                    <q-input
                      v-model="filters.title"
                      outlined
                      dense
                      clearable
                      label="Поиск"
                      aria-label="Поиск по заголовку и описанию"
                    />
                  </div>

                  <div class="col-12 col-sm-6 col-md-2">
                    <q-select
                      v-model="filters.priority"
                      outlined
                      dense
                      clearable
                      emit-value
                      map-options
                      label="Приоритет"
                      :options="priorityOptions"
                      aria-label="Фильтр по приоритету"
                    />
                  </div>

                  <div class="col-12 col-sm-6 col-md-2">
                    <q-select
                      v-model="filters.status"
                      outlined
                      dense
                      clearable
                      emit-value
                      map-options
                      label="Статус"
                      :options="statusOptions"
                      aria-label="Фильтр по статусу"
                    />
                  </div>

                  <div class="col-12 col-sm-6 col-md-3">
                    <q-select
                      v-model="filters.assignedTo"
                      outlined
                      dense
                      clearable
                      emit-value
                      map-options
                      label="Назначен"
                      :options="assigneeFilterOptions"
                      aria-label="Фильтр по назначению"
                    />
                  </div>

                  <div class="col-12 col-sm-6 col-md-2">
                    <q-select
                      v-model="filters.syncStatus"
                      outlined
                      dense
                      clearable
                      emit-value
                      map-options
                      label="Синхронизация"
                      :options="syncFilterOptions"
                      aria-label="Фильтр по синхронизации"
                    />
                  </div>

                  <div class="col-12 col-sm-6 col-md-3">
                    <q-input
                      :model-value="filters.updatedFrom"
                      outlined
                      dense
                      readonly
                      placeholder="ГГГГ-ММ-ДД ЧЧ:ММ"
                      label="Обновлён с"
                      aria-label="Фильтр по дате и времени обновления с"
                      @click="updatedFromPopup?.show?.()"
                    >
                      <template #prepend>
                        <q-icon name="event" class="cursor-pointer">
                          <q-popup-proxy
                            ref="updatedFromPopup"
                            cover
                            transition-show="scale"
                            transition-hide="scale"
                          >
                            <div class="bg-white q-pa-sm">
                              <q-date
                                v-model="filters.updatedFrom"
                                mask="YYYY-MM-DD HH:mm"
                                minimal
                              />
                              <q-time
                                v-model="filters.updatedFrom"
                                mask="YYYY-MM-DD HH:mm"
                                format24h
                              />
                              <div class="row items-center justify-between q-mt-sm">
                                <q-btn
                                  flat
                                  color="grey-7"
                                  label="Очистить"
                                  @click="filters.updatedFrom = ''"
                                />
                                <q-btn
                                  flat
                                  color="primary"
                                  label="Закрыть"
                                  @click="updatedFromPopup?.hide?.()"
                                />
                              </div>
                            </div>
                          </q-popup-proxy>
                        </q-icon>
                      </template>

                      <template #append>
                        <q-btn
                          v-if="filters.updatedFrom"
                          flat
                          round
                          dense
                          icon="close"
                          aria-label="Очистить дату начала периода обновления"
                          @click.stop="filters.updatedFrom = ''"
                        />
                      </template>
                    </q-input>
                  </div>

                  <div class="col-12 col-sm-6 col-md-3">
                    <q-input
                      :model-value="filters.updatedTo"
                      outlined
                      dense
                      readonly
                      placeholder="ГГГГ-ММ-ДД ЧЧ:ММ"
                      label="Обновлён по"
                      aria-label="Фильтр по дате и времени обновления по"
                      @click="updatedToPopup?.show?.()"
                    >
                      <template #prepend>
                        <q-icon name="event" class="cursor-pointer">
                          <q-popup-proxy
                            ref="updatedToPopup"
                            cover
                            transition-show="scale"
                            transition-hide="scale"
                          >
                            <div class="bg-white q-pa-sm">
                              <q-date v-model="filters.updatedTo" mask="YYYY-MM-DD HH:mm" minimal />
                              <q-time
                                v-model="filters.updatedTo"
                                mask="YYYY-MM-DD HH:mm"
                                format24h
                              />
                              <div class="row items-center justify-between q-mt-sm">
                                <q-btn
                                  flat
                                  color="grey-7"
                                  label="Очистить"
                                  @click="filters.updatedTo = ''"
                                />
                                <q-btn
                                  flat
                                  color="primary"
                                  label="Закрыть"
                                  @click="updatedToPopup?.hide?.()"
                                />
                              </div>
                            </div>
                          </q-popup-proxy>
                        </q-icon>
                      </template>

                      <template #append>
                        <q-btn
                          v-if="filters.updatedTo"
                          flat
                          round
                          dense
                          icon="close"
                          aria-label="Очистить дату конца периода обновления"
                          @click.stop="filters.updatedTo = ''"
                        />
                      </template>
                    </q-input>
                  </div>

                  <div v-if="props.useNewTicketsTable" class="col-12 col-sm-6 col-md-3">
                    <q-input
                      v-model="filters.createdAt"
                      outlined
                      dense
                      clearable
                      label="Создан"
                      aria-label="Фильтр по дате создания"
                    />
                  </div>

                  <div class="col-12 col-md-auto">
                    <q-btn flat color="primary" label="Сбросить фильтры" @click="resetFilters" />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </q-menu>
        </q-btn>
        <q-btn
          ref="createTicketButtonRef"
          color="primary"
          label="Новый тикет"
          aria-label="Создать новый тикет"
          @click="openCreate"
        />
      </template>
    </OpPageHeader>

    <div
      v-if="syncProgressVisible"
      class="tickets-page__sync-strip"
      :class="{ 'tickets-page__sync-strip--active': !reducedMotion && syncInProgress }"
      aria-live="polite"
    >
      <div class="tickets-page__sync-strip-head">
        <div class="text-caption text-weight-medium">Синхронизация очереди</div>
        <div class="text-caption">{{ syncProgressProcessedLabel }} / {{ syncTotal }}</div>
      </div>

      <div class="tickets-page__sync-track" aria-hidden="true">
        <div
          class="tickets-page__sync-bar"
          :class="{ 'tickets-page__sync-bar--animated': !reducedMotion && syncInProgress }"
          :style="{ transform: `scaleX(${syncProgressPercent / 100})` }"
        />
      </div>

      <div class="tickets-page__sync-strip-meta text-caption text-grey-7">
        <span>{{ syncProgressStateLabel }}</span>
        <span>в очереди {{ syncProgressRemainingLabel }}</span>
      </div>
    </div>

    <TicketsErrorState
      v-if="error"
      title="Не удалось загрузить тикеты"
      :message="error"
      retry-label="Повторить загрузку"
      @retry="reload"
    />

    <TicketsErrorState
      v-else-if="syncError"
      title="Синхронизация завершилась ошибкой"
      :message="syncError"
      retry-label="Повторить синхронизацию"
      @retry="retrySync"
    />

    <q-table
      v-model:pagination="pagination"
      flat
      bordered
      row-key="id"
      :rows="rows"
      :columns="columns"
      :loading="loading"
      :virtual-scroll="props.useNewTicketsTable"
      :rows-per-page-options="props.useNewTicketsTable ? [0] : [10, 20, 50]"
      :table-style="props.useNewTicketsTable ? 'max-height: 520px' : undefined"
      no-data-label="Тикетов пока нет"
      :dense="$q.screen.lt.md || props.useNewTicketsTable"
      wrap-cells
      aria-label="Таблица тикетов"
      @row-click="handleRowClick"
    >
      <template #body-cell-priority="slotProps">
        <q-td :props="slotProps">
          <q-badge color="grey-8">
            {{ priorityLabel(slotProps.row.priority) }}
          </q-badge>
        </q-td>
      </template>

      <template #body-cell-status="slotProps">
        <q-td :props="slotProps">
          <q-badge :color="statusColor(slotProps.row.status)">
            {{ statusLabel(slotProps.row.status) }}
          </q-badge>
          <q-badge v-if="slotProps.row.isLocalOnly" color="warning" class="q-ml-xs">
            офлайн
          </q-badge>
          <q-badge v-if="slotProps.row.conflict" color="negative" class="q-ml-xs">
            конфликт
          </q-badge>
        </q-td>
      </template>

      <template #body-cell-assignedTo="slotProps">
        <q-td :props="slotProps">
          <span>{{ assigneeLabel(slotProps.row) }}</span>
        </q-td>
      </template>

      <template #body-cell-sync="slotProps">
        <q-td :props="slotProps">
          <q-badge :color="syncColor(slotProps.row.syncStatus)">
            {{ syncLabel(slotProps.row.syncStatus) }}
          </q-badge>
          <div v-if="slotProps.row.lastError" class="text-caption text-negative q-mt-xs">
            {{ slotProps.row.lastError }}
          </div>
        </q-td>
      </template>

      <template #body-cell-updatedAt="slotProps">
        <q-td :props="slotProps">
          <div>{{ formatDateTime(slotProps.row.updatedAt) }}</div>
          <div v-if="slotProps.row.isLocalOnly" class="text-caption text-grey-7">
            локальный черновик
          </div>
        </q-td>
      </template>

      <template v-if="props.useNewTicketsTable" #body-cell-createdAt="slotProps">
        <q-td :props="slotProps">
          {{ formatDateTime(slotProps.row.createdAt) }}
        </q-td>
      </template>

      <template #body-cell-actions="slotProps">
        <q-td :props="slotProps" class="text-right">
          <q-btn
            v-if="canDeleteTicket(slotProps.row)"
            flat
            dense
            color="negative"
            label="Удалить"
            :aria-label="`Удалить тикет ${slotProps.row.title}`"
            @click.stop="confirmDelete(slotProps.row)"
          />
          <span
            v-if="!canEditTicket(slotProps.row) && !canDeleteTicket(slotProps.row)"
            class="text-caption text-grey-7"
          >
            только просмотр
          </span>
        </q-td>
      </template>
    </q-table>

    <q-dialog
      v-model="detailsDialogOpen"
      :transition-show="dialogTransition"
      :transition-hide="dialogTransition"
    >
      <q-card v-if="viewingTicket" flat bordered class="tickets-page__dialog">
        <q-card-section class="row items-start no-wrap">
          <div class="col">
            <div class="text-h6">
              {{ viewingTicket.title }}
            </div>
            <div class="text-caption text-grey-7 q-mt-xs">Полная информация о тикете.</div>
          </div>
          <q-btn v-close-popup flat round dense icon="close" aria-label="Закрыть карточку тикета" />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="tickets-page__details-grid q-mb-lg">
            <div>
              <div class="text-caption text-grey-7">Статус</div>
              <div v-if="!canEditViewedTicket">
                {{ statusLabel(viewingTicket.status) }}
              </div>
              <q-select
                v-else-if="!viewingTicket.isLocalOnly"
                v-model="detailsForm.status"
                outlined
                dense
                emit-value
                map-options
                :options="statusOptions"
                aria-label="Статус тикета"
              />
              <div v-else>
                {{ statusLabel(viewingTicket.status) }}
              </div>
            </div>
            <div>
              <div class="text-caption text-grey-7">Приоритет</div>
              <div v-if="!canEditViewedTicket">
                {{ priorityLabel(viewingTicket.priority) }}
              </div>
              <q-select
                v-else
                v-model="detailsForm.priority"
                outlined
                dense
                emit-value
                map-options
                :options="priorityOptions"
                aria-label="Приоритет тикета"
              />
            </div>
            <div>
              <div class="text-caption text-grey-7">Назначен</div>
              <div v-if="!props.canUpdateTickets">
                {{ assigneeLabel(viewingTicket) }}
              </div>
              <q-select
                v-else
                v-model="detailsForm.assignedTo"
                outlined
                dense
                clearable
                emit-value
                map-options
                :options="assignableUserOptions"
                aria-label="Исполнитель тикета"
              />
            </div>
            <div>
              <div class="text-caption text-grey-7">Автор</div>
              <div>{{ creatorLabel(viewingTicket) }}</div>
            </div>
            <div>
              <div class="text-caption text-grey-7">Синхронизация</div>
              <div>{{ syncLabel(viewingTicket.syncStatus) }}</div>
            </div>
            <div>
              <div class="text-caption text-grey-7">Обновлён</div>
              <div>{{ formatDateTime(viewingTicket.updatedAt) }}</div>
            </div>
            <div>
              <div class="text-caption text-grey-7">Создан</div>
              <div>{{ formatDateTime(viewingTicket.createdAt) }}</div>
            </div>
          </div>

          <q-form class="q-gutter-md" @submit.prevent="submitViewedTicket">
            <q-input
              v-model="detailsForm.title"
              outlined
              :readonly="!canEditViewedTicket"
              label="Заголовок"
              aria-label="Заголовок тикета"
            />
            <q-input
              v-model="detailsForm.description"
              outlined
              type="textarea"
              :readonly="!canEditViewedTicket"
              label="Описание"
              aria-label="Описание тикета"
              autogrow
            />

            <div class="row justify-end q-gutter-sm">
              <q-btn v-close-popup flat label="Закрыть" aria-label="Закрыть карточку тикета" />
              <q-btn
                v-if="canEditViewedTicket"
                color="primary"
                label="Сохранить"
                aria-label="Сохранить изменения тикета"
                type="submit"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog
      v-model="dialogOpen"
      :transition-show="dialogTransition"
      :transition-hide="dialogTransition"
    >
      <q-card flat bordered class="tickets-page__dialog">
        <q-card-section>
          <div class="text-h6">Создать тикет</div>
          <div class="text-caption text-grey-7 q-mt-xs">Заполните основные поля нового тикета.</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form class="q-gutter-md" @submit.prevent="submit">
            <q-input
              v-model="form.title"
              v-focus-when="dialogOpen"
              outlined
              label="Заголовок"
              aria-label="Заголовок тикета"
            />
            <q-input
              v-model="form.description"
              outlined
              type="textarea"
              label="Описание"
              aria-label="Описание тикета"
              autogrow
            />
            <q-select
              v-model="form.priority"
              outlined
              label="Приоритет"
              :options="priorityOptions"
              emit-value
              map-options
              aria-label="Приоритет тикета"
            />

            <q-select
              v-if="props.canUpdateTickets"
              v-model="form.assignedTo"
              outlined
              clearable
              emit-value
              map-options
              label="Исполнитель"
              :options="assignableUserOptions"
              aria-label="Исполнитель тикета"
            />

            <div class="row justify-end q-gutter-sm">
              <q-btn v-close-popup flat label="Отмена" aria-label="Отменить изменения" />
              <q-btn color="primary" label="Сохранить" aria-label="Сохранить тикет" type="submit" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </section>
</template>

<style scoped>
.tickets-page__dialog {
  width: min(100%, 32.5rem);
  background: #fff;
}

.tickets-page__filters-card {
  width: min(92vw, 68rem);
}

.tickets-page__sync-strip {
  display: grid;
  gap: 0.4rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 16px;
  background: rgb(239 246 255);
  transition:
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.tickets-page__status-badge--queue,
.tickets-page__status-badge--sync,
.tickets-page__status-badge--conflict {
  will-change: transform, box-shadow;
}

.tickets-page__status-badge--queue {
  animation: ticketsQueueGlow 2.8s ease-in-out infinite;
}

.tickets-page__status-badge--sync {
  animation: ticketsSyncPulse 1.35s ease-in-out infinite;
}

.tickets-page__status-badge--conflict {
  animation: ticketsConflictBeacon 1.8s ease-in-out infinite;
}

.tickets-page__sync-strip--active {
  animation: ticketsSyncStripBreath 1.8s ease-in-out infinite;
}

.tickets-page__sync-strip-head,
.tickets-page__sync-strip-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.tickets-page__sync-track {
  overflow: hidden;
  height: 0.5rem;
  border-radius: 999px;
  background: rgb(191 219 254);
}

.tickets-page__sync-bar {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transform-origin: left center;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(37 99 235), rgb(59 130 246), rgb(96 165 250));
  background-size: 200% 100%;
  will-change: transform, background-position;
}

.tickets-page__sync-bar--animated {
  animation: ticketsSyncBarShift 1.5s linear infinite;
}

.tickets-page__sync-bar--animated::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 8%,
    rgb(255 255 255 / 0.12) 36%,
    rgb(255 255 255 / 0.42) 50%,
    rgb(255 255 255 / 0.12) 64%,
    transparent 92%
  );
  transform: translateX(-100%);
  animation: ticketsSyncShimmer 1.6s ease-in-out infinite;
}

.tickets-page__details-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tickets-page__description {
  white-space: pre-wrap;
}

:deep(.q-table tbody tr) {
  cursor: pointer;
}

:deep(.q-table tbody tr:hover) {
  background: rgba(15, 85, 177, 0.04);
}

:deep(.body--dark) .tickets-page__sync-strip,
:deep(.q-dark) .tickets-page__sync-strip {
  border-color: rgb(30 64 175);
  background: rgb(30 41 59);
}

:deep(.body--dark) .tickets-page__sync-track,
:deep(.q-dark) .tickets-page__sync-track {
  background: rgb(30 64 175 / 0.45);
}

@keyframes ticketsQueueGlow {
  0%,
  100% {
    transform: translateY(0);
    box-shadow: 0 0 0 rgb(245 158 11 / 0);
  }

  50% {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgb(245 158 11 / 0.24);
  }
}

@keyframes ticketsSyncPulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 rgb(59 130 246 / 0);
  }

  50% {
    transform: scale(1.03);
    box-shadow: 0 0 0 8px rgb(59 130 246 / 0.14);
  }
}

@keyframes ticketsConflictBeacon {
  0%,
  100% {
    transform: translateY(0);
    box-shadow: 0 0 0 rgb(220 38 38 / 0);
  }

  35% {
    transform: translateY(-1px);
    box-shadow: 0 0 0 8px rgb(220 38 38 / 0.16);
  }

  65% {
    transform: translateY(0);
    box-shadow: 0 10px 20px rgb(220 38 38 / 0.16);
  }
}

@keyframes ticketsSyncStripBreath {
  0%,
  100% {
    box-shadow: 0 0 0 rgb(37 99 235 / 0);
  }

  50% {
    box-shadow: 0 10px 26px rgb(37 99 235 / 0.12);
  }
}

@keyframes ticketsSyncBarShift {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 200% 50%;
  }
}

@keyframes ticketsSyncShimmer {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(125%);
  }
}

@media (max-width: 599px) {
  .tickets-page__dialog {
    width: calc(100vw - 1.5rem);
  }

  .tickets-page__sync-strip-head,
  .tickets-page__sync-strip-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .tickets-page__details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
