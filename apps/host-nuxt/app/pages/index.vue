<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiGet } from '@opshub/shared-api';
import type { HealthResponse } from '../types/api';

const health = ref<HealthResponse | null>(null);

onMounted(async () => {
  health.value = await apiGet<HealthResponse>('/health');
});
</script>

<template>
  <div>
    <h1 class="text-h5 q-mb-sm">Добро пожаловать в OpsHub</h1>
    <div class="text-body1 text-grey-7">Выберите модуль в левом меню.</div>

    <q-card class="q-mt-md">
      <q-card-section>
        <div class="text-subtitle1">Статус системы</div>
        <div class="text-caption text-grey-7">Хост-оболочка запущена.</div>
      </q-card-section>
    </q-card>
  </div>
</template>
