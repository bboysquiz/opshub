<template>
  <div>
    <q-banner v-if="error" rounded class="bg-red-1 text-red-9 q-mb-md">
      {{ error }}
    </q-banner>

    <q-card v-else-if="loading">
      <q-card-section class="row items-center q-gutter-sm">
        <q-spinner color="primary" />
        <div>Загружаю модуль тикетов…</div>
      </q-card-section>
    </q-card>

    <component
      :is="RemoteComp"
      v-else-if="RemoteComp"
      :user-role="auth.currentUser?.role ?? null"
      :current-user-id="auth.currentUser?.id ?? null"
      :current-user-email="auth.currentUser?.email ?? null"
      :can-update-tickets="auth.canUpdateTickets"
      :can-delete-tickets="auth.canDeleteTickets"
      :use-new-tickets-table="auth.featureFlags.newTicketsTable"
    />
  </div>
</template>

<script setup lang="ts">
import { useRemoteModule } from '~/composables/useRemoteModule';
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();

const {
  component: RemoteComp,
  error,
  loading,
} = useRemoteModule({
  entryUrl: 'http://localhost:3010/remoteEntry.js',
  exposedModule: './TicketsApp',
  errorMessage: 'Не удалось загрузить модуль тикетов',
});
</script>
