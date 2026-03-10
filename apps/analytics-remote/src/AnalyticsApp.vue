<template>
  <AnalyticsPage />
</template>

<script setup lang="ts">
import { ensureAnalyticsChartsRegistered } from './app/charts';
import AnalyticsPage from './features/analytics/ui/AnalyticsPage.vue';

ensureAnalyticsChartsRegistered();
</script>
