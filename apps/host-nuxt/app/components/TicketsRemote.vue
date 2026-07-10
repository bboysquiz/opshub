<script setup lang="ts">
import { useRemoteModule } from '~/composables/useRemoteModule';
import { useAuthStore } from '~/stores/auth';
import { useOpsHubRuntimeConfig } from '~/utils/runtime';

type TicketsRemoteProps = {
  initialSpaceId?: string | null;
  initialProjectId?: string | null;
};

withDefaults(defineProps<TicketsRemoteProps>(), {
  initialSpaceId: null,
  initialProjectId: null,
});

const auth = useAuthStore();
const { ticketsRemoteEntryUrl } = useOpsHubRuntimeConfig();

const {
  component: RemoteComp,
  error,
  loading,
} = useRemoteModule({
  entryUrl: ticketsRemoteEntryUrl,
  exposedModule: './TicketsApp',
  errorMessage: 'Не удалось загрузить модуль тикетов',
});
</script>

<template>
  <div>
    <q-banner v-if="error" rounded class="bg-red-1 text-red-9 q-mb-md">
      {{ error }}
    </q-banner>

    <q-card v-else-if="loading" flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-spinner color="primary" />
        <div>Загружаю модуль тикетов...</div>
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
      :initial-space-id="initialSpaceId"
      :initial-project-id="initialProjectId"
    />
  </div>
</template>
