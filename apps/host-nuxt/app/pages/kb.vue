<template>
  <div>
    <h1 class="text-h5 q-mb-md">База знаний</h1>

    <q-banner v-if="error" rounded class="bg-red-1 text-red-9 q-mb-md">
      {{ error }}
    </q-banner>

    <q-card v-else-if="loading">
      <q-card-section class="row items-center q-gutter-sm">
        <q-spinner color="primary" />
        <div>Загружаю удалённый модуль базы знаний...</div>
      </q-card-section>
    </q-card>

    <component :is="RemoteComp" v-else-if="RemoteComp" />
  </div>
</template>

<script setup lang="ts">
import { useRemoteModule } from '~/composables/useRemoteModule';

const {
  component: RemoteComp,
  error,
  loading,
} = useRemoteModule({
  entryUrl: 'http://localhost:3020/assets/remoteEntry.js',
  exposedModule: './KbApp',
  errorMessage: 'Не удалось загрузить удалённый модуль базы знаний',
});
</script>
