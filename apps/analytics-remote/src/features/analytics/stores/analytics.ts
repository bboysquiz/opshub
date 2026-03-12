import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { analyticsApi } from '../api/analyticsApi';
import type { AnalyticsFilters, AnalyticsTicket, TeamKind } from '../domain/models';

const DEFAULT_FILTERS: AnalyticsFilters = {
  dateFrom: '',
  dateTo: '',
  status: 'all',
  team: 'all',
};

const TEAM_ORDER: TeamKind[] = ['support', 'operations', 'requesters', 'unassigned'];

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return 'Для просмотра аналитики требуется авторизация';
    }

    if (error.message === 'Internal server error') {
      return 'Внутренняя ошибка сервера';
    }

    if (error.message === 'Failed to fetch') {
      return 'Не удалось подключиться к серверу аналитики';
    }

    return error.message;
  }

  return 'Не удалось загрузить аналитику';
}

export const useAnalyticsStore = defineStore('analytics', () => {
  const tickets = ref<AnalyticsTicket[]>([]);
  const filters = ref<AnalyticsFilters>({ ...DEFAULT_FILTERS });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastLoadedAt = ref<string | null>(null);

  const availableTeams = computed(() => {
    const seen = new Set<TeamKind>();

    tickets.value.forEach((ticket) => {
      seen.add(ticket.assignedTeam);
    });

    return TEAM_ORDER.filter((team) => seen.has(team));
  });

  async function loadTickets() {
    loading.value = true;
    error.value = null;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      tickets.value = [];
      error.value = 'Офлайн-режим: аналитика недоступна без сети';
      loading.value = false;
      return;
    }

    try {
      tickets.value = await analyticsApi.listTickets();
      lastLoadedAt.value = new Date().toISOString();
    } catch (loadError) {
      tickets.value = [];
      error.value = normalizeErrorMessage(loadError);
    } finally {
      loading.value = false;
    }
  }

  function patchFilters(patch: Partial<AnalyticsFilters>) {
    filters.value = {
      ...filters.value,
      ...patch,
    };
  }

  function hydrateFilters(next: Partial<AnalyticsFilters>) {
    filters.value = {
      ...DEFAULT_FILTERS,
      ...next,
    };
  }

  function resetFilters() {
    filters.value = { ...DEFAULT_FILTERS };
  }

  return {
    tickets,
    filters,
    loading,
    error,
    lastLoadedAt,
    availableTeams,
    loadTickets,
    patchFilters,
    hydrateFilters,
    resetFilters,
  };
});
