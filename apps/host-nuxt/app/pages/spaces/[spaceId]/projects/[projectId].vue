<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from '#imports';
import { useSpacesStore } from '~/stores/spaces';

const route = useRoute();
const spacesStore = useSpacesStore();
const { spaces, loading, error } = storeToRefs(spacesStore);
const initializing = ref(true);

const spaceId = computed(() => String(route.params.spaceId ?? ''));
const projectId = computed(() => String(route.params.projectId ?? ''));
const space = computed(() => spaces.value.find((item) => item.id === spaceId.value) ?? null);
const project = computed(
  () => space.value?.projects.find((item) => item.id === projectId.value) ?? null,
);
const backToSpacePath = computed(() => `/spaces/${encodeURIComponent(spaceId.value)}`);

async function loadProject() {
  initializing.value = true;
  spacesStore.clearError();

  try {
    await spacesStore.loadSpaces();
  } catch {
    // The store exposes a normalized error for this page.
  } finally {
    initializing.value = false;
  }
}

onMounted(loadProject);
</script>

<template>
  <section class="q-gutter-y-md" aria-labelledby="project-title">
    <div class="row items-center q-gutter-xs text-body2">
      <q-btn flat dense no-caps icon="arrow_back" label="Пространства" to="/spaces" />
      <q-icon name="chevron_right" />
      <q-btn flat dense no-caps :label="space?.name ?? 'Пространство'" :to="backToSpacePath" />
    </div>

    <q-banner v-if="error" rounded class="bg-red-1 text-red-9">
      {{ error }}
      <template #action>
        <q-btn flat color="negative" label="Повторить" :loading="loading" @click="loadProject" />
      </template>
    </q-banner>

    <q-card v-if="initializing" flat bordered data-test="project-loading">
      <q-card-section class="row items-center q-gutter-sm">
        <q-spinner color="primary" />
        <span>Загружаю проект...</span>
      </q-card-section>
    </q-card>

    <q-banner
      v-else-if="!error && (!space || !project)"
      rounded
      class="bg-orange-1 text-orange-10"
      data-test="project-unavailable"
    >
      <strong>Проект недоступен.</strong>
      Возможно, он удалён или у вас больше нет доступа.
    </q-banner>

    <template v-else-if="space && project">
      <header>
        <h1 id="project-title" class="text-h5 q-my-none">
          {{ project.name }}
        </h1>
        <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
          {{ project.description || `Тикеты проекта в пространстве «${space.name}».` }}
        </p>
      </header>

      <TicketsRemote
        :key="project.id"
        :initial-space-id="space.id"
        :initial-project-id="project.id"
      />
    </template>
  </section>
</template>
