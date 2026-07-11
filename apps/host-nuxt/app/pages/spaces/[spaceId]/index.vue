<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { navigateTo, useRoute } from '#imports';
import { useSpacesStore } from '~/stores/spaces';

const route = useRoute();
const spacesStore = useSpacesStore();
const { spaces, loading, error } = storeToRefs(spacesStore);
const initializing = ref(true);

const spaceId = computed(() => String(route.params.spaceId ?? ''));
const space = computed(() => spaces.value.find((item) => item.id === spaceId.value) ?? null);

function projectPath(projectId: string): string {
  return `/spaces/${encodeURIComponent(spaceId.value)}/projects/${encodeURIComponent(projectId)}`;
}

async function openProject(projectId: string) {
  await navigateTo(projectPath(projectId));
}

async function loadSpace() {
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

onMounted(loadSpace);
</script>

<template>
  <section class="q-gutter-y-md" aria-labelledby="space-title">
    <div class="row items-center q-gutter-xs text-body2">
      <q-btn flat dense no-caps icon="arrow_back" label="Пространства" to="/spaces" />
    </div>

    <q-banner v-if="error" rounded class="bg-red-1 text-red-9">
      {{ error }}
      <template #action>
        <q-btn flat color="negative" label="Повторить" :loading="loading" @click="loadSpace" />
      </template>
    </q-banner>

    <q-card v-if="initializing" flat bordered data-test="space-loading">
      <q-card-section class="row items-center q-gutter-sm">
        <q-spinner color="primary" />
        <span>Загружаю проекты...</span>
      </q-card-section>
    </q-card>

    <q-banner
      v-else-if="!error && !space"
      rounded
      class="bg-orange-1 text-orange-10"
      data-test="space-unavailable"
    >
      <strong>Пространство недоступно.</strong>
      Возможно, оно удалено или у вас больше нет доступа.
    </q-banner>

    <template v-else-if="space">
      <header>
        <h1 id="space-title" class="text-h5 q-my-none">
          {{ space.name }}
        </h1>
        <p v-if="space.description" class="text-body2 text-grey-7 q-mt-xs q-mb-none">
          {{ space.description }}
        </p>
      </header>

      <q-banner
        v-if="!space.projects.length"
        rounded
        class="bg-blue-1 text-blue-9"
        data-test="projects-empty"
      >
        <strong>В пространстве пока нет проектов.</strong>
      </q-banner>

      <q-card v-else flat bordered>
        <q-list separator aria-label="Проекты пространства">
          <q-item
            v-for="project in space.projects"
            :key="project.id"
            v-ripple
            clickable
            data-test="project-link"
            @click="openProject(project.id)"
          >
            <q-item-section avatar>
              <q-icon name="folder" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">
                {{ project.name }}
              </q-item-label>
              <q-item-label v-if="project.description" caption>
                {{ project.description }}
              </q-item-label>
              <q-item-label caption> {{ project.members.length }} участников </q-item-label>
            </q-item-section>
            <q-item-section v-if="project.archivedAt" side>
              <q-badge color="grey-7" label="Архив" />
            </q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </template>
  </section>
</template>
