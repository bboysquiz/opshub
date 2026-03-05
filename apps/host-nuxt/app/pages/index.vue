<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiGet } from '@opshub/shared-api';
import type { HealthResponse } from '../types/api';
import { QBtn } from 'quasar';

const health = ref<HealthResponse | null>(null);

onMounted(async () => {
  health.value = await apiGet<HealthResponse>('/health');
});
</script>

<template>
  <div class="q-pa-md">
    <div class="text-h5 q-mb-md">OpsHub Host</div>
    <ClientOnly>
      <QBtn label="Quasar работает" class="q-mb-md" />
    </ClientOnly>
    <pre v-if="health">{{ health }}</pre>
  </div>
</template>
