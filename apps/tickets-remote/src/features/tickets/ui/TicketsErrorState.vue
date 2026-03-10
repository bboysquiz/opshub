<script setup lang="ts">
import { QBanner, QBtn } from 'quasar';

withDefaults(
  defineProps<{
    title?: string;
    message: string | null;
    retryLabel?: string;
  }>(),
  {
    title: 'Что-то пошло не так',
    retryLabel: 'Повторить',
  },
);

defineEmits<{
  retry: [];
}>();
</script>

<template>
  <q-banner v-if="message" rounded class="bg-red-1 text-red-9 q-mb-md">
    <div class="text-subtitle2 q-mb-xs">
      {{ title }}
    </div>
    <div class="text-caption">
      {{ message }}
    </div>
    <div class="q-mt-sm">
      <q-btn color="primary" :label="retryLabel" @click="$emit('retry')" />
    </div>
  </q-banner>
</template>
