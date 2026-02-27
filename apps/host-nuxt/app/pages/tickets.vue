<template>
  <div class="q-pa-md">
    <div class="text-h6 q-mb-md">
      Host -> Tickets Remote
    </div>

    <component
      :is="RemoteComp"
      v-if="RemoteComp"
    />
    <div v-else-if="!loadError">
      Loading remote...
    </div>
    <div
      v-else
      class="text-negative"
    >
      {{ loadError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, type Component } from 'vue';
import type { RemoteContainer } from '../types/module-federation';

const RemoteComp = shallowRef<Component | null>(null);

const loadError = shallowRef('');

async function loadRemoteComponent(url: string, module: string) {
  const container = (await import(/* @vite-ignore */ url)) as RemoteContainer;
  await container.init?.({});
  const factory = await container.get(module);
  const mod = factory();
  return typeof mod === 'object' && mod !== null && 'default' in mod ? mod.default : mod;
}

onMounted(async () => {
  try {
    RemoteComp.value = await loadRemoteComponent(
      'http://localhost:3010/assets/remoteEntry.js',
      './TicketsApp',
    );
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Failed to load remote';
  }
});
</script>
