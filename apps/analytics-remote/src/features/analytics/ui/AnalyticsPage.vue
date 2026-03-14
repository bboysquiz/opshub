<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type { ChartData, ChartOptions } from 'chart.js';
import { OpPageHeader, OpPanel, useReducedMotion } from '@opshub/shared-ui';
import {
  QBanner,
  QBtn,
  QDate,
  QIcon,
  QInput,
  QPopupProxy,
  QSelect,
  QSeparator,
  QSpinner,
  QTable,
  QTd,
} from 'quasar';
import { computed, onMounted, ref, watch } from 'vue';
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

const { availableTeams, error, filters, loading, slaSettings, tickets } =
  storeToRefs(analyticsStore);
const { snapshot } = useMemoizedAnalytics(tickets, filters, slaSettings);
const { reducedMotion } = useReducedMotion();

const filtersReady = ref(false);
const dateFromPopup = ref<{ hide: () => void; show: () => void } | null>(null);
const dateToPopup = ref<{ hide: () => void; show: () => void } | null>(null);

const statusOptions: Array<{ label: string; value: TicketStatus | 'all' }> = [
  { label: 'Все статусы', value: 'all' },
  { label: 'Открыт', value: 'open' },
  { label: 'В работе', value: 'in_progress' },
  { label: 'Решён', value: 'resolved' },
];

const teamOptions = computed<Array<{ label: string; value: TeamFilter }>>(() => [
  { label: 'Все роли', value: 'all' },
  ...availableTeams.value.map((team) => ({
    label: teamLabels[team],
    value: team,
  })),
]);

const columns = [
  { name: 'title', label: 'Тикет', field: 'title', align: 'left' as const },
  { name: 'status', label: 'Статус', field: 'status', align: 'left' as const },
  { name: 'team', label: 'Роль исполнителя', field: 'assignedTeam', align: 'left' as const },
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

const statusChartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: reducedMotion.value ? false : { duration: 220 },
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
}));

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

const timelineChartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: reducedMotion.value ? false : { duration: 220 },
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
}));

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

const slaChartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: reducedMotion.value ? false : { duration: 220 },
  normalized: true,
  plugins: {
    legend: {
      position: 'bottom',
    },
  },
}));

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

const teamChartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: reducedMotion.value ? false : { duration: 220 },
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
}));

const tableRows = computed(() => snapshot.value.tableRows);
const statusSummary = computed(() =>
  snapshot.value.byStatus.map((item) => `${item.label}: ${item.count}`).join(', '),
);
const timelineSummary = computed(() =>
  snapshot.value.byTimeline.map((item) => `${item.label}: ${item.count}`).join(', '),
);
const slaSummary = computed(() =>
  snapshot.value.bySla.map((item) => `${item.label}: ${item.count}`).join(', '),
);
const teamSummary = computed(() =>
  snapshot.value.byTeam.map((item) => `${item.label}: ${item.count}`).join(', '),
);

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

  await authStore.bootstrapAuth();
  await analyticsStore.loadTickets();
});
</script>

<template>
  <section class="analytics-page op-page q-pa-md" aria-labelledby="analytics-page-title">
    <OpPageHeader
      id="analytics-page-title"
      title="Аналитика"
      subtitle="SLA, динамика тикетов и фильтры с сохранением в URL и sessionStorage."
    >
      <template #actions>
        <q-btn
          flat
          color="secondary"
          label="Сбросить фильтры"
          aria-label="Сбросить фильтры аналитики"
          @click="analyticsStore.resetFilters()"
        />
        <q-btn
          flat
          color="secondary"
          label="Экспорт CSV"
          aria-label="Экспортировать таблицу аналитики в CSV"
          :disable="!tableRows.length"
          @click="exportCsv"
        />
        <q-btn
          color="primary"
          label="Обновить"
          aria-label="Обновить аналитику"
          :loading="loading"
          @click="refreshAnalytics"
        />
      </template>
    </OpPageHeader>

    <q-banner v-if="error" rounded class="bg-red-1 text-red-9 q-mb-md" aria-live="polite">
      {{ error }}
    </q-banner>

    <OpPanel class="q-mb-md" title="Фильтры" caption="Фильтры сохраняются в URL и sessionStorage.">
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-3">
          <q-input
            :model-value="filters.dateFrom"
            outlined
            dense
            readonly
            placeholder="ГГГГ-ММ-ДД"
            label="Дата с"
            aria-label="Дата начала периода"
            @click="dateFromPopup?.show()"
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
                @click.stop="patchFilter('dateFrom', '')"
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
            aria-label="Дата окончания периода"
            @click="dateToPopup?.show()"
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
                @click.stop="patchFilter('dateTo', '')"
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
            aria-label="Фильтр по статусу"
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
            label="Роль исполнителя"
            :options="teamOptions"
            aria-label="Фильтр по роли исполнителя"
            @update:model-value="(value) => patchFilter('team', value)"
          />
        </div>
      </div>

      <q-separator />

      <div class="text-caption text-grey-7">
        Фильтры сохраняются в URL и `sessionStorage`. Аналитика показывает распределение по ролям
        исполнителей.
      </div>
    </OpPanel>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-xl-3">
        <OpPanel title="Всего тикетов">
          <div>
            <div class="text-caption text-grey-7">Всего тикетов</div>
            <div class="text-h5">
              {{ snapshot.totalCount }}
            </div>
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-sm-6 col-xl-3">
        <OpPanel title="Активные">
          <div>
            <div class="text-caption text-grey-7">Активные</div>
            <div class="text-h5">
              {{ snapshot.activeCount }}
            </div>
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-sm-6 col-xl-3">
        <OpPanel title="Среднее время реакции">
          <div>
            <div class="text-caption text-grey-7">Среднее время реакции</div>
            <div class="text-h6">
              {{ formatDuration(snapshot.avgResponseMinutes) }}
            </div>
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-sm-6 col-xl-3">
        <OpPanel title="Нарушено SLA">
          <div>
            <div class="text-caption text-grey-7">Нарушено SLA</div>
            <div class="text-h5">
              {{ snapshot.breachedCount }}
            </div>
            <div class="text-caption text-grey-7">решено {{ snapshot.resolvedSharePercent }}%</div>
          </div>
        </OpPanel>
      </div>
    </div>

    <div v-if="loading" class="row items-center q-gutter-sm q-mb-md" aria-live="polite">
      <q-spinner />
      <div>Загружаю аналитику…</div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-xl-4">
        <OpPanel class="analytics-card" title="Тикеты по статусам">
          <div class="op-sr-only" aria-live="polite">
            {{ statusSummary }}
          </div>
          <div class="analytics-chart" role="img" aria-label="График тикетов по статусам">
            <Bar :data="statusChartData" :options="statusChartOptions" />
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-xl-5">
        <OpPanel class="analytics-card" title="Тикеты во времени">
          <div class="op-sr-only" aria-live="polite">
            {{ timelineSummary }}
          </div>
          <div
            class="analytics-chart analytics-chart--wide"
            role="img"
            aria-label="График тикетов во времени"
          >
            <Line :data="timelineChartData" :options="timelineChartOptions" />
          </div>
        </OpPanel>
      </div>

      <div class="col-12 col-xl-3">
        <OpPanel class="analytics-card" title="SLA">
          <div class="op-sr-only" aria-live="polite">
            {{ slaSummary }}
          </div>
          <div class="analytics-chart" role="img" aria-label="График SLA">
            <Doughnut :data="slaChartData" :options="slaChartOptions" />
          </div>
        </OpPanel>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12">
        <OpPanel
          class="analytics-card"
          title="Распределение по ролям"
          caption="Распределение по ролям исполнителей."
        >
          <div class="op-sr-only" aria-live="polite">
            {{ teamSummary }}
          </div>
          <div
            class="analytics-chart analytics-chart--wide"
            role="img"
            aria-label="График распределения по ролям"
          >
            <Bar :data="teamChartData" :options="teamChartOptions" />
          </div>
        </OpPanel>
      </div>
    </div>

    <OpPanel title="Список тикетов" caption="Virtual scroll включён для длинных списков.">
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
        aria-label="Таблица тикетов аналитики"
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
    </OpPanel>
  </section>
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

@media (max-width: 1023px) {
  .analytics-chart,
  .analytics-chart--wide {
    height: 240px;
  }
}
</style>
