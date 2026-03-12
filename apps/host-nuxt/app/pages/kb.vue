<template>
  <div>
    <q-banner v-if="error" rounded class="bg-red-1 text-red-9 q-mb-md">
      {{ error }}
    </q-banner>

    <q-card v-else-if="loading">
      <q-card-section class="row items-center q-gutter-sm">
        <q-spinner color="primary" />
        <div>Загружаю удалённый модуль базы знаний...</div>
      </q-card-section>
    </q-card>

    <component
      :is="RemoteComp"
      v-else-if="RemoteComp"
      :user-role="auth.currentUser?.role ?? null"
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
  entryUrl: 'http://localhost:3020/remoteEntry.js',
  exposedModule: './KbApp',
  errorMessage: 'Не удалось загрузить удалённый модуль базы знаний',
});
</script>
