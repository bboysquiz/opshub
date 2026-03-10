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
import { useSyncStore } from '../stores/sync';
import { useTicketsStore } from '../stores/tickets';
import type { LocalTicket, TicketPriority, TicketStatus } from '../domain/models';
import SyncDiagnostics from './SyncDiagnostics.vue';
import TicketsErrorState from './TicketsErrorState.vue';
import { useTicketsNotify } from './useTicketsNotify';

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
});

const columns = [
  { name: 'title', label: 'Заголовок', field: 'title', align: 'left' as const },
  { name: 'priority', label: 'Приоритет', field: 'priority', align: 'left' as const },
  { name: 'status', label: 'Статус', field: 'status', align: 'left' as const },
  { name: 'sync', label: 'Синхронизация', field: 'syncStatus', align: 'left' as const },
  { name: 'updatedAt', label: 'Обновлён', field: 'updatedAt', align: 'left' as const },
  { name: 'actions', label: 'Действия', field: 'actions', align: 'right' as const },
];

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
}

function openCreate() {
  editingTicket.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(ticket: LocalTicket) {
  editingTicket.value = ticket;
  form.title = ticket.title;
  form.description = ticket.description;
  form.priority = ticket.priority;
  form.status = ticket.status;
  dialogOpen.value = true;
}

async function submit() {
  try {
    if (editingTicket.value) {
      await ticketsStore.updateTicket(editingTicket.value.id, {
        title: form.title,
        description: form.description,
        priority: form.priority,
        ...(editingTicket.value.isLocalOnly ? {} : { status: form.status }),
      });

      notifySavedLocally('updated');
    } else {
      await ticketsStore.createTicket({
        title: form.title,
        description: form.description,
        priority: form.priority,
      });

      notifySavedLocally('created');
    }

    dialogOpen.value = false;
  } catch (submitError) {
    notifySaveFailed(submitError);
  }
}

function confirmDelete(ticket: LocalTicket) {
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
      row-key="id"
      :rows="rows"
      :columns="columns"
      :loading="loading"
      no-data-label="Тикетов пока нет"
    >
      <template #body-cell-priority="props">
        <q-td :props="props">
          <q-badge color="grey-8">
            {{ priorityLabel(props.row.priority) }}
          </q-badge>
        </q-td>
      </template>

      <template #body-cell-status="props">
        <q-td :props="props">
          <q-badge :color="statusColor(props.row.status)">
            {{ statusLabel(props.row.status) }}
          </q-badge>
          <q-badge v-if="props.row.isLocalOnly" color="warning" class="q-ml-xs"> офлайн </q-badge>
          <q-badge v-if="props.row.conflict" color="negative" class="q-ml-xs"> конфликт </q-badge>
        </q-td>
      </template>

      <template #body-cell-sync="props">
        <q-td :props="props">
          <q-badge :color="syncColor(props.row.syncStatus)">
            {{ syncLabel(props.row.syncStatus) }}
          </q-badge>
          <div v-if="props.row.lastError" class="text-caption text-negative q-mt-xs">
            {{ props.row.lastError }}
          </div>
        </q-td>
      </template>

      <template #body-cell-updatedAt="props">
        <q-td :props="props">
          <div>{{ formatDateTime(props.row.updatedAt) }}</div>
          <div v-if="props.row.isLocalOnly" class="text-caption text-grey-7">
            локальный черновик
          </div>
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat dense color="primary" label="Изменить" @click="openEdit(props.row)" />
          <q-btn flat dense color="negative" label="Удалить" @click="confirmDelete(props.row)" />
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
