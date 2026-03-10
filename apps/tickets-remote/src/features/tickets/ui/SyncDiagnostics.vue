<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { QBadge, QBtn, QCard, QCardSection, QInput, QTable } from 'quasar';
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { getMeta } from '../infra/dexie';
import { useSyncStore } from '../stores/sync';
import { useTicketsStore } from '../stores/tickets';
import TicketsErrorState from './TicketsErrorState.vue';
import { useTicketsNotify } from './useTicketsNotify';

const authStore = useAuthStore();
const syncStore = useSyncStore();
const ticketsStore = useTicketsStore();
const { notifyConflictDetected, notifySyncFailed } = useTicketsNotify();

const {
  queue,
  queueSize,
  conflictCount,
  lastSyncAt,
  lastAutoSyncAt,
  lastFlushedCount,
  syncError,
  online,
  syncInProgress,
  autoSyncActive,
} = storeToRefs(syncStore);
const { loading: ticketsLoading } = storeToRefs(ticketsStore);

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

const lastReadSource = ref<string | null>(null);
const lastReadStrategy = ref<string | null>(null);
const lastReadAt = ref<string | null>(null);

const commandTypeLabels: Record<string, string> = {
  create: 'Создание',
  update: 'Обновление',
  delete: 'Удаление',
};

const queueStatusLabels: Record<string, string> = {
  pending: 'Ожидает',
  processing: 'Обрабатывается',
  failed: 'Ошибка',
  conflict: 'Конфликт',
};

const readSourceLabels: Record<string, string> = {
  network: 'Сеть',
  idb: 'IndexedDB',
  memory: 'Память',
};

const strategyLabels: Record<string, string> = {
  network_first: 'Сначала сеть',
  idb_first: 'Сначала IndexedDB',
  cache_first: 'Сначала кэш',
};

const columns = [
  { name: 'type', label: 'Тип', field: 'type', align: 'left' as const },
  { name: 'ticketId', label: 'Тикет', field: 'ticketId', align: 'left' as const },
  { name: 'tries', label: 'Попытки', field: 'tries', align: 'left' as const },
  { name: 'status', label: 'Статус', field: 'status', align: 'left' as const },
  {
    name: 'baseUpdatedAt',
    label: 'Базовое время обновления',
    field: 'baseUpdatedAt',
    align: 'left' as const,
  },
  { name: 'lastError', label: 'Последняя ошибка', field: 'lastError', align: 'left' as const },
];

const rows = computed(() => queue.value);

async function refreshReadDiagnostics() {
  lastReadSource.value = (await getMeta('lastReadSource')) as string | null;
  lastReadStrategy.value = (await getMeta('lastReadStrategy')) as string | null;
  lastReadAt.value = (await getMeta('lastReadAt')) as string | null;
}

function readSourceLabel(value: string | null) {
  if (!value) {
    return 'неизвестно';
  }

  return readSourceLabels[value] ?? value;
}

function strategyLabel(value: string | null) {
  if (!value) {
    return 'неизвестно';
  }

  return strategyLabels[value] ?? value;
}

function commandTypeLabel(value: string) {
  return commandTypeLabels[value] ?? value;
}

function queueStatusLabel(value: string) {
  return queueStatusLabels[value] ?? value;
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

watch(lastSyncAt, () => {
  void refreshReadDiagnostics();
});

async function flushNow() {
  await syncStore.flushQueue();
  await refreshReadDiagnostics();
}

async function reloadFromNetwork() {
  await ticketsStore.loadTickets(true);
  await refreshReadDiagnostics();
}

async function retrySync() {
  await syncStore.retryAll();
  await refreshReadDiagnostics();
}

onMounted(async () => {
  await authStore.bootstrapAuth();
  await syncStore.init();
  await ticketsStore.init();
  await refreshReadDiagnostics();
});
</script>

<template>
  <div class="q-pa-md">
    <TicketsErrorState
      v-if="syncError"
      title="Синхронизация завершилась ошибкой"
      :message="syncError"
      retry-label="Повторить синхронизацию"
      @retry="retrySync"
    />

    <q-card flat bordered class="q-mb-md">
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

        <div class="col-auto">
          <q-badge :color="conflictCount ? 'negative' : 'positive'">
            конфликты {{ conflictCount }}
          </q-badge>
        </div>

        <div class="col-auto text-grey-7">
          последняя синхронизация: {{ lastSyncAt ?? 'никогда' }}
        </div>
        <div class="col-auto text-grey-7">
          последняя авто-синхронизация: {{ lastAutoSyncAt ?? 'никогда' }}
        </div>
        <div class="col-auto text-grey-7">обработано: {{ lastFlushedCount }}</div>
        <div class="col-auto text-grey-7">
          источник чтения: {{ readSourceLabel(lastReadSource) }}
        </div>
        <div class="col-auto text-grey-7">стратегия: {{ strategyLabel(lastReadStrategy) }}</div>
        <div class="col-auto text-grey-7">последнее чтение: {{ lastReadAt ?? 'никогда' }}</div>
        <div class="col-auto">
          <q-badge :color="autoSyncActive ? 'positive' : 'grey-7'">
            {{ autoSyncActive ? 'автосинхронизация включена' : 'автосинхронизация на паузе' }}
          </q-badge>
        </div>
        <div class="col-auto">
          <q-badge :color="syncInProgress ? 'info' : 'grey-7'">
            {{ syncInProgress ? 'идёт синк' : 'ожидание' }}
          </q-badge>
        </div>
        <div class="col">
          <q-btn
            flat
            color="primary"
            label="Отправить очередь сейчас"
            :disable="!online"
            :loading="syncInProgress"
            @click="flushNow"
          />
          <q-btn
            flat
            color="primary"
            label="Перезагрузить из сети"
            :disable="!online"
            :loading="ticketsLoading"
            @click="reloadFromNetwork"
          />
          <q-btn
            flat
            color="secondary"
            label="Повторить синхронизацию"
            :loading="syncInProgress"
            @click="retrySync"
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
      no-data-label="Очередь пуста"
    >
      <template #body-cell-type="props">
        <q-td :props="props">
          {{ commandTypeLabel(props.row.type) }}
        </q-td>
      </template>

      <template #body-cell-status="props">
        <q-td :props="props">
          {{ queueStatusLabel(props.row.status) }}
        </q-td>
      </template>

      <template #body-cell-baseUpdatedAt="props">
        <q-td :props="props">
          {{ props.row.baseUpdatedAt ?? '—' }}
        </q-td>
      </template>

      <template #body-cell-lastError="props">
        <q-td :props="props">
          {{ props.row.lastError ?? '—' }}
        </q-td>
      </template>
    </q-table>
  </div>
</template>
