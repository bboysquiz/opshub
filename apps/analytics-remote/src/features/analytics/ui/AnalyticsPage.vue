<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  QBadge,
  QBanner,
  QBtn,
  QCard,
  QCardSection,
  QDate,
  QIcon,
  QInput,
  QPopupProxy,
  QSelect,
  QSeparator,
  QSpace,
  QSpinner,
  QTable,
  QTd,
} from 'quasar';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Bar, Doughnut, Line } from 'vue-chartjs';
import { useAuthStore } from '../../../stores/auth';
import { useAnalyticsStore } from '../stores/analytics';
import {
  restoreAnalyticsFilters,
  persistAnalyticsFilters,
} from '../composables/useAnalyticsFiltersPersistence';
import { useMemoizedAnalytics } from '../composables/useMemoizedAnalytics';
import type { TeamKind, TeamFilter, TicketPriority, TicketStatus } from '../domain/models';
import { downloadAnalyticsCsv } from '../utils/csv';
import {
  formatDateTime,
  formatDuration,
  priorityColors,
  priorityLabels,
  statusColors,
  statusLabels,
  teamColors,
  teamLabels,
} from '../utils/labels';

const authStore = useAuthStore();
const analyticsStore = useAnalyticsStore();

const { availableTeams, error, filters, lastLoadedAt, loading, tickets } =
  storeToRefs(analyticsStore);
const { snapshot } = useMemoizedAnalytics(tickets, filters);

const filtersReady = ref(false);
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
const dateFromPopup = ref<{ hide: () => void } | null>(null);
const dateToPopup = ref<{ hide: () => void } | null>(null);

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

const statusOptions: Array<{ label: string; value: TicketStatus | 'all' }> = [
  { label: 'Все статусы', value: 'all' },
  { label: 'Открыт', value: 'open' },
  { label: 'В работе', value: 'in_progress' },
  { label: 'Решён', value: 'resolved' },
];

const teamOptions = computed<Array<{ label: string; value: TeamFilter }>>(() => [
  { label: 'Все команды', value: 'all' },
  ...availableTeams.value.map((team) => ({
    label: teamLabels[team],
    value: team,
  })),
]);

const columns = [
  { name: 'title', label: 'Тикет', field: 'title', align: 'left' as const },
  { name: 'status', label: 'Статус', field: 'status', align: 'left' as const },
  { name: 'team', label: 'Команда', field: 'assignedTeam', align: 'left' as const },
  { name: 'priority', label: 'Приоритет', field: 'priority', align: 'left' as const },
  { name: 'response', label: 'Реакция', field: 'responseMinutes', align: 'left' as const },
  { name: 'sla', label: 'SLA', field: 'slaBreached', align: 'left' as const },
  { name: 'createdAt', label: 'Создан', field: 'createdAt', align: 'left' as const },
];

const statusChartData = computed<ChartData<'bar'>>(() => ({
  labels: snapshot.value.byStatus.map((item) => item.label),
  datasets: [
    {
      label: 'Тикеты',
      data: snapshot.value.byStatus.map((item) => item.count),
      backgroundColor: ['#1d4ed8', '#f59e0b', '#059669'],
      borderRadius: 10,
      maxBarThickness: 42,
    },
  ],
}));

const statusChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 220,
  },
  normalized: true,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};

const timelineChartData = computed<ChartData<'line'>>(() => ({
  labels: snapshot.value.byTimeline.map((item) => item.label),
  datasets: [
    {
      label: 'Тикеты по дням',
      data: snapshot.value.byTimeline.map((item) => item.count),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.18)',
      tension: 0.3,
      fill: true,
      pointRadius: 3,
      pointHoverRadius: 4,
    },
  ],
}));

const timelineChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 220,
  },
  normalized: true,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};

const slaChartData = computed<ChartData<'doughnut'>>(() => ({
  labels: snapshot.value.bySla.map((item) => item.label),
  datasets: [
    {
      data: snapshot.value.bySla.map((item) => item.count),
      backgroundColor: ['#10b981', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 6,
    },
  ],
}));

const slaChartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 220,
  },
  normalized: true,
  plugins: {
    legend: {
      position: 'bottom',
    },
  },
};

const teamChartData = computed<ChartData<'bar'>>(() => ({
  labels: snapshot.value.byTeam.map((item) => item.label),
  datasets: [
    {
      label: 'Тикеты',
      data: snapshot.value.byTeam.map((item) => item.count),
      backgroundColor: ['#1d4ed8', '#7c3aed', '#f59e0b', '#6b7280'],
      borderRadius: 10,
      maxBarThickness: 42,
    },
  ],
}));

const teamChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 220,
  },
  normalized: true,
  plugins: {
    legend: {
      display: false,
    },
  },
  indexAxis: 'y',
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};

const tableRows = computed(() => snapshot.value.tableRows);

function updateOnlineState() {
  online.value = navigator.onLine;
}

function formatLastLoadedAt(value: string | null) {
  if (!value) {
    return 'ещё не загружалось';
  }

  return formatDateTime(value);
}

function teamColor(team: TeamKind) {
  return teamColors[team];
}

function teamLabel(team: TeamKind) {
  return teamLabels[team];
}

function statusColor(status: TicketStatus) {
  return statusColors[status];
}

function statusLabel(status: TicketStatus) {
  return statusLabels[status];
}

function priorityColor(priority: TicketPriority) {
  return priorityColors[priority];
}

function priorityLabel(priority: TicketPriority) {
  return priorityLabels[priority];
}

function refreshAnalytics() {
  return analyticsStore.loadTickets();
}

function exportCsv() {
  downloadAnalyticsCsv(tableRows.value);
}

function patchFilter<K extends keyof typeof filters.value>(
  key: K,
  value: (typeof filters.value)[K],
) {
  analyticsStore.patchFilters({ [key]: value } as Partial<typeof filters.value>);
}

function selectDate(
  key: 'dateFrom' | 'dateTo',
  value: string | null,
  popupRef: { hide: () => void } | null,
) {
  patchFilter(key, value ?? '');
  popupRef?.hide();
}

watch(
  filters,
  (next) => {
    if (!filtersReady.value) {
      return;
    }

    persistAnalyticsFilters(next);
  },
  { deep: true },
);

onMounted(async () => {
  analyticsStore.hydrateFilters(restoreAnalyticsFilters());
  filtersReady.value = true;

  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);

  await authStore.bootstrapAuth();
  await analyticsStore.loadTickets();
});

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineState);
  window.removeEventListener('offline', updateOnlineState);
});
</script>

<template>
  <div class="analytics-page q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h6">Аналитика</div>
      <q-badge :color="online ? 'positive' : 'negative'" class="q-px-sm q-py-xs">
        {{ online ? 'онлайн' : 'офлайн' }}
      </q-badge>
      <q-badge color="grey-7" class="q-px-sm q-py-xs">
        обновлено {{ formatLastLoadedAt(lastLoadedAt) }}
      </q-badge>
      <q-space />
      <q-btn
        flat
        color="secondary"
        label="Сбросить фильтры"
        @click="analyticsStore.resetFilters()"
      />
      <q-btn
        flat
        color="secondary"
        label="Экспорт CSV"
        :disable="!tableRows.length"
        @click="exportCsv"
      />
      <q-btn color="primary" label="Обновить" :loading="loading" @click="refreshAnalytics" />
    </div>

    <q-banner v-if="error" rounded class="bg-red-1 text-red-9 q-mb-md">
      {{ error }}
    </q-banner>

    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col-12 col-lg-6">
          <q-input
            v-model="accessTokenInput"
            outlined
            dense
            type="password"
            label="Токен доступа (JWT)"
            placeholder="Вставь JWT, если refresh-cookie ещё нет"
          />
        </div>

        <div class="col-12 col-lg-6 text-caption text-grey-7">
          Аналитика использует защищённый endpoint. Если сессия уже открыта, токен подтянется
          автоматически через refresh-cookie.
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-md">
        <div class="col-12 col-md-3">
          <q-input
            :model-value="filters.dateFrom"
            outlined
            dense
            readonly
            placeholder="ГГГГ-ММ-ДД"
            label="Дата с"
          >
            <template #prepend>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy
                  ref="dateFromPopup"
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-date
                    :model-value="filters.dateFrom"
                    mask="YYYY-MM-DD"
                    minimal
                    @update:model-value="
                      (value) => selectDate('dateFrom', String(value ?? ''), dateFromPopup)
                    "
                  >
                    <div class="row items-center justify-between q-pa-sm">
                      <q-btn
                        flat
                        color="grey-7"
                        label="Очистить"
                        @click="selectDate('dateFrom', '', dateFromPopup)"
                      />
                      <q-btn flat color="primary" label="Закрыть" @click="dateFromPopup?.hide()" />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>

            <template #append>
              <q-btn
                v-if="filters.dateFrom"
                flat
                round
                dense
                icon="close"
                aria-label="Очистить дату начала"
                @click="patchFilter('dateFrom', '')"
              />
            </template>
          </q-input>
        </div>

        <div class="col-12 col-md-3">
          <q-input
            :model-value="filters.dateTo"
            outlined
            dense
            readonly
            placeholder="ГГГГ-ММ-ДД"
            label="Дата по"
          >
            <template #prepend>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy
                  ref="dateToPopup"
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-date
                    :model-value="filters.dateTo"
                    mask="YYYY-MM-DD"
                    minimal
                    @update:model-value="
                      (value) => selectDate('dateTo', String(value ?? ''), dateToPopup)
                    "
                  >
                    <div class="row items-center justify-between q-pa-sm">
                      <q-btn
                        flat
                        color="grey-7"
                        label="Очистить"
                        @click="selectDate('dateTo', '', dateToPopup)"
                      />
                      <q-btn flat color="primary" label="Закрыть" @click="dateToPopup?.hide()" />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>

            <template #append>
              <q-btn
                v-if="filters.dateTo"
                flat
                round
                dense
                icon="close"
                aria-label="Очистить дату окончания"
                @click="patchFilter('dateTo', '')"
              />
            </template>
          </q-input>
        </div>

        <div class="col-12 col-md-3">
          <q-select
            :model-value="filters.status"
            outlined
            dense
            emit-value
            map-options
            label="Статус"
            :options="statusOptions"
            @update:model-value="(value) => patchFilter('status', value)"
          />
        </div>

        <div class="col-12 col-md-3">
          <q-select
            :model-value="filters.team"
            outlined
            dense
            emit-value
            map-options
            label="Команда"
            :options="teamOptions"
            @update:model-value="(value) => patchFilter('team', value)"
          />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="text-caption text-grey-7">
        Фильтры сохраняются в URL и `sessionStorage`. В текущей модели поле команды ещё не выделено,
        поэтому фильтр "Команда" строится по роли исполнителя.
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-xl-3">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Всего тикетов</div>
            <div class="text-h5">
              {{ snapshot.totalCount }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-xl-3">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Активные</div>
            <div class="text-h5">
              {{ snapshot.activeCount }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-xl-3">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Среднее время реакции</div>
            <div class="text-h6">
              {{ formatDuration(snapshot.avgResponseMinutes) }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-xl-3">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Нарушено SLA</div>
            <div class="text-h5">
              {{ snapshot.breachedCount }}
            </div>
            <div class="text-caption text-grey-7">решено {{ snapshot.resolvedSharePercent }}%</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div v-if="loading" class="row items-center q-gutter-sm q-mb-md">
      <q-spinner />
      <div>Загружаю аналитику…</div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-xl-4">
        <q-card flat bordered class="analytics-card">
          <q-card-section>
            <div class="text-subtitle1">Тикеты по статусам</div>
          </q-card-section>
          <q-separator />
          <q-card-section class="analytics-chart">
            <Bar :data="statusChartData" :options="statusChartOptions" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-xl-5">
        <q-card flat bordered class="analytics-card">
          <q-card-section>
            <div class="text-subtitle1">Тикеты во времени</div>
          </q-card-section>
          <q-separator />
          <q-card-section class="analytics-chart analytics-chart--wide">
            <Line :data="timelineChartData" :options="timelineChartOptions" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-xl-3">
        <q-card flat bordered class="analytics-card">
          <q-card-section>
            <div class="text-subtitle1">SLA</div>
          </q-card-section>
          <q-separator />
          <q-card-section class="analytics-chart">
            <Doughnut :data="slaChartData" :options="slaChartOptions" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12">
        <q-card flat bordered class="analytics-card">
          <q-card-section>
            <div class="text-subtitle1">Распределение по командам</div>
          </q-card-section>
          <q-separator />
          <q-card-section class="analytics-chart analytics-chart--wide">
            <Bar :data="teamChartData" :options="teamChartOptions" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section class="row items-center">
        <div class="text-subtitle1">Список тикетов</div>
        <q-space />
        <div class="text-caption text-grey-7">Virtual scroll включён для длинных списков</div>
      </q-card-section>

      <q-separator />

      <q-table
        flat
        row-key="id"
        virtual-scroll
        :rows-per-page-options="[0]"
        :pagination="{ rowsPerPage: 0 }"
        :rows="tableRows"
        :columns="columns"
        no-data-label="Под выбранные фильтры тикетов нет"
        table-style="max-height: 420px"
      >
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.status)">
              {{ statusLabel(props.row.status) }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-team="props">
          <q-td :props="props">
            <q-badge :color="teamColor(props.row.assignedTeam)">
              {{ teamLabel(props.row.assignedTeam) }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-priority="props">
          <q-td :props="props">
            <q-badge :color="priorityColor(props.row.priority)">
              {{ priorityLabel(props.row.priority) }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-response="props">
          <q-td :props="props">
            {{ formatDuration(props.row.responseMinutes) }}
          </q-td>
        </template>

        <template #body-cell-sla="props">
          <q-td :props="props">
            <q-badge :color="props.row.slaBreached ? 'negative' : 'positive'">
              {{ props.row.slaBreached ? 'Нарушение' : 'В SLA' }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-createdAt="props">
          <q-td :props="props">
            {{ formatDateTime(props.row.createdAt) }}
          </q-td>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<style scoped>
.analytics-card {
  height: 100%;
}

.analytics-chart {
  height: 280px;
}

.analytics-chart--wide {
  height: 320px;
}
</style>
