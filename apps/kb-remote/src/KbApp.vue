<script setup lang="ts">
type KbRuntimeProps = {
  userRole?: 'admin' | 'agent' | 'employee' | null;
};

const props = withDefaults(defineProps<KbRuntimeProps>(), {
  userRole: null,
});

import KbPage from './features/kb/ui/KbPage.vue';
</script>

<template>
  <KbPage :user-role="props.userRole" />
</template>
