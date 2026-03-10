<template>
  <div class="q-pa-md">
    <div class="text-h6 q-mb-md">Аналитика</div>

    <q-banner v-if="error" rounded class="bg-red-1 text-red-9 q-mb-md">
      {{ error }}
    </q-banner>

    <q-card v-if="!RemoteComp && !error">
      <q-card-section class="row items-center q-gutter-sm">
        <q-spinner />
        <div>Загружаю модуль аналитики…</div>
      </q-card-section>
    </q-card>

    <component :is="RemoteComp" v-if="RemoteComp" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { computed } from 'vue';
import { useRemoteModule } from '../composables/useRemoteModule';

const { component, error } = useRemoteModule<Component>({
  entryUrl: 'http://localhost:3030/assets/remoteEntry.js',
  exposedModule: './AnalyticsApp',
  errorMessage: 'Не удалось загрузить модуль аналитики',
});

const RemoteComp = computed(() => component.value);
</script>
