<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  QBadge,
  QBtn,
  QCard,
  QCardSection,
  Dialog,
  QDialog,
  QForm,
  QInput,
  QSelect,
  QSpace,
  QTable,
  QTd,
} from 'quasar';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { usersApi, type AssignableUser } from '../api/usersApi';
import { useSyncStore } from '../stores/sync';
import { useTicketsStore } from '../stores/tickets';
import type { LocalTicket, TicketPriority, TicketStatus } from '../domain/models';
import SyncDiagnostics from './SyncDiagnostics.vue';
import TicketsErrorState from './TicketsErrorState.vue';
import { useTicketsNotify } from './useTicketsNotify';

type TicketsPageProps = {
  userRole?: 'admin' | 'agent' | 'employee' | null;
  canUpdateTickets?: boolean;
  canDeleteTickets?: boolean;
  useNewTicketsTable?: boolean;
};

const props = withDefaults(defineProps<TicketsPageProps>(), {
  userRole: null,
  canUpdateTickets: true,
  canDeleteTickets: true,
  useNewTicketsTable: false,
});

const {
  notifyConflictDetected,
  notifyRemovedLocally,
  notifySavedLocally,
  notifySaveFailed,
  notifySyncFailed,
} = useTicketsNotify();
const authStore = useAuthStore();
const ticketsStore = useTicketsStore();
const syncStore = useSyncStore();

const { visibleTickets, loading, error } = storeToRefs(ticketsStore);
const { conflictCount, queueSize, online, syncError, syncInProgress } = storeToRefs(syncStore);

const accessTokenInput = computed({
  get: () => authStore.accessToken,
  set: (value: string) => {
    if (value) {
      authStore.setAccessToken(value);
      return;
    }

    authStore.clearAccessToken();
  },
});

const showDiagnostics = ref(false);
const dialogOpen = ref(false);
const editingTicket = ref<LocalTicket | null>(null);
const assignableUsers = ref<Array<{ label: string; value: string }>>([]);

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

const form = reactive({
  title: '',
  description: '',
  priority: 'medium' as TicketPriority,
  status: 'open' as TicketStatus,
  assignedTo: null as string | null,
});

const columns = computed<
  Array<{ name: string; label: string; field: string; align: 'left' | 'right' }>
>(() => {
  const base: Array<{ name: string; label: string; field: string; align: 'left' | 'right' }> = [
    { name: 'title', label: 'Заголовок', field: 'title', align: 'left' as const },
    { name: 'priority', label: 'Приоритет', field: 'priority', align: 'left' as const },
    { name: 'status', label: 'Статус', field: 'status', align: 'left' as const },
    { name: 'sync', label: 'Синхронизация', field: 'syncStatus', align: 'left' as const },
    { name: 'updatedAt', label: 'Обновлён', field: 'updatedAt', align: 'left' as const },
  ];

  if (props.useNewTicketsTable) {
    base.splice(4, 0, {
      name: 'createdAt',
      label: 'Создан',
      field: 'createdAt',
      align: 'left' as const,
    });
  }

  base.push({ name: 'actions', label: 'Действия', field: 'actions', align: 'right' as const });

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

const rows = computed(() => visibleTickets.value);
const employeeReadOnly = computed(() => props.userRole === 'employee');

function canEditTicket(ticket: LocalTicket) {
  return props.canUpdateTickets || ticket.isLocalOnly;
}

function canDeleteTicket(ticket: LocalTicket) {
  return props.canDeleteTickets || ticket.isLocalOnly;
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
  form.status = 'open';
  form.assignedTo = null;
}

function openCreate() {
  editingTicket.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(ticket: LocalTicket) {
  if (!canEditTicket(ticket)) {
    return;
  }

  editingTicket.value = ticket;
  form.title = ticket.title;
  form.description = ticket.description;
  form.priority = ticket.priority;
  form.status = ticket.status;
  form.assignedTo = ticket.assignedTo;
  dialogOpen.value = true;
}

async function loadAssignableUsers() {
  if (!props.canUpdateTickets) {
    assignableUsers.value = [];
    return;
  }

  try {
    const users = await usersApi.listAssignable();
    assignableUsers.value = users.map((user: AssignableUser) => ({
      label: `${user.email} (${user.role})`,
      value: user.id,
    }));
  } catch {
    assignableUsers.value = [];
  }
}

async function submit() {
  try {
    if (editingTicket.value) {
      if (!canEditTicket(editingTicket.value)) {
        throw new Error('У текущей роли нет прав на изменение серверных тикетов');
      }

      await ticketsStore.updateTicket(editingTicket.value.id, {
        title: form.title,
        description: form.description,
        priority: form.priority,
        assignedTo: form.assignedTo,
        ...(editingTicket.value.isLocalOnly ? {} : { status: form.status }),
      });

      notifySavedLocally('updated');
    } else {
      await ticketsStore.createTicket({
        title: form.title,
        description: form.description,
        priority: form.priority,
        assignedTo: form.assignedTo,
      });

      notifySavedLocally('created');
    }

    dialogOpen.value = false;
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
    await ticketsStore.removeTicket(ticket.id);
    notifyRemovedLocally();
  });
}

async function reload() {
  await ticketsStore.loadTickets(true);
}

async function syncNow() {
  await syncStore.flushQueue();
}

async function retrySync() {
  await syncStore.retryAll();
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

onMounted(async () => {
  await authStore.bootstrapAuth();
  await syncStore.init();
  await ticketsStore.init();
  await loadAssignableUsers();
  await ticketsStore.loadTickets();
});
</script>

<template>
  <div class="q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h6">Тикеты</div>

      <q-badge color="warning" class="q-px-sm q-py-xs"> очередь {{ queueSize }} </q-badge>

      <q-badge v-if="syncInProgress" color="info" class="q-px-sm q-py-xs">
        идёт синхронизация
      </q-badge>

      <q-badge v-if="conflictCount" color="negative" class="q-px-sm q-py-xs">
        конфликты {{ conflictCount }}
      </q-badge>

      <q-badge v-if="props.useNewTicketsTable" color="secondary" class="q-px-sm q-py-xs">
        новая таблица
      </q-badge>

      <q-badge v-if="employeeReadOnly" color="grey-7" class="q-px-sm q-py-xs">
        режим сотрудника: без изменения серверных тикетов
      </q-badge>

      <q-space />

      <q-btn outline color="secondary" label="Диагностика" @click="showDiagnostics = true" />
      <q-btn color="primary" label="Новый тикет" @click="openCreate" />
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

    <q-card bordered flat class="q-mb-md">
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col-12 col-md-5">
          <q-input
            v-model="accessTokenInput"
            outlined
            dense
            type="password"
            label="Токен доступа (JWT)"
            placeholder="Вставь JWT-токен доступа"
          />
        </div>

        <div class="col-auto">
          <q-badge :color="online ? 'positive' : 'negative'">
            {{ online ? 'онлайн' : 'офлайн' }}
          </q-badge>
        </div>

        <div class="col-auto">
          <q-badge color="warning"> очередь {{ queueSize }} </q-badge>
        </div>

        <div class="col">
          <q-space />
        </div>

        <div class="col-auto">
          <q-btn flat color="secondary" label="Диагностика" @click="showDiagnostics = true" />
        </div>

        <div class="col-auto">
          <q-btn flat color="primary" label="Обновить" @click="reload" />
        </div>

        <div class="col-auto">
          <q-btn
            flat
            color="secondary"
            label="Синхронизировать сейчас"
            :loading="syncInProgress"
            @click="syncNow"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-table
      flat
      bordered
      :dense="props.useNewTicketsTable"
      row-key="id"
      :rows="rows"
      :columns="columns"
      :loading="loading"
      :virtual-scroll="props.useNewTicketsTable"
      :rows-per-page-options="props.useNewTicketsTable ? [0] : [10, 20, 50]"
      :pagination="props.useNewTicketsTable ? { rowsPerPage: 0 } : undefined"
      :table-style="props.useNewTicketsTable ? 'max-height: 520px' : undefined"
      no-data-label="Тикетов пока нет"
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
            v-if="canEditTicket(slotProps.row)"
            flat
            dense
            color="primary"
            label="Изменить"
            @click="openEdit(slotProps.row)"
          />
          <q-btn
            v-if="canDeleteTicket(slotProps.row)"
            flat
            dense
            color="negative"
            label="Удалить"
            @click="confirmDelete(slotProps.row)"
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

    <q-dialog v-model="dialogOpen">
      <q-card style="min-width: 380px; width: 100%; max-width: 520px">
        <q-card-section class="text-h6">
          {{ editingTicket ? 'Редактировать тикет' : 'Создать тикет' }}
        </q-card-section>

        <q-card-section>
          <q-form class="q-gutter-md" @submit.prevent="submit">
            <q-input v-model="form.title" outlined label="Заголовок" />
            <q-input v-model="form.description" outlined type="textarea" label="Описание" />
            <q-select
              v-model="form.priority"
              outlined
              label="Приоритет"
              :options="priorityOptions"
              emit-value
              map-options
            />

            <q-select
              v-if="props.canUpdateTickets"
              v-model="form.assignedTo"
              outlined
              clearable
              emit-value
              map-options
              label="Исполнитель"
              :options="assignableUsers"
            />

            <q-select
              v-if="editingTicket && !editingTicket.isLocalOnly"
              v-model="form.status"
              outlined
              label="Статус"
              :options="statusOptions"
              emit-value
              map-options
            />

            <div class="row justify-end q-gutter-sm">
              <q-btn v-close-popup flat label="Отмена" />
              <q-btn color="primary" label="Сохранить" type="submit" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDiagnostics" maximized>
      <q-card style="width: 100%; max-width: 1080px; margin: 0 auto">
        <q-card-section class="row items-center">
          <div class="text-h6">Диагностика синхронизации</div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" aria-label="Закрыть диагностику" />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <SyncDiagnostics />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>
