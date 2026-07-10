<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import { useSpacesStore } from '~/stores/spaces';

const spacesStore = useSpacesStore();
const { spaces, loading, error } = storeToRefs(spacesStore);
const initializing = ref(true);

function spacePath(spaceId: string): string {
  return `/spaces/${encodeURIComponent(spaceId)}`;
}

async function loadSpaces() {
  if (loading.value) {
    return;
  }

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

onMounted(loadSpaces);
</script>

<template>
  <section class="q-gutter-y-md" aria-labelledby="spaces-title">
    <div class="row items-start q-col-gutter-md">
      <div class="col">
        <h1 id="spaces-title" class="text-h5 q-my-none">Пространства</h1>
        <div class="text-body2 text-grey-7 q-mt-xs">Доступные вам пространства и проекты.</div>
      </div>
      <div class="col-auto">
        <q-btn
          outline
          color="primary"
          icon="refresh"
          label="Обновить"
          :loading="loading"
          :disable="initializing"
          @click="loadSpaces"
        />
      </div>
    </div>

    <q-banner v-if="error" rounded class="bg-red-1 text-red-9" data-test="spaces-error">
      {{ error }}
      <template #action>
        <q-btn flat color="negative" label="Повторить" :loading="loading" @click="loadSpaces" />
      </template>
    </q-banner>

    <q-card v-if="initializing" flat bordered data-test="spaces-loading">
      <q-card-section class="row items-center q-gutter-sm">
        <q-spinner color="primary" />
        <span>Загружаю пространства...</span>
      </q-card-section>
    </q-card>

    <q-banner
      v-else-if="!error && !spaces.length"
      rounded
      class="bg-blue-1 text-blue-9"
      data-test="spaces-empty"
    >
      <strong>Доступных пространств пока нет.</strong>
      Обратитесь к администратору или агенту, чтобы получить доступ.
    </q-banner>

    <q-card v-else-if="spaces.length" flat bordered>
      <q-list separator aria-label="Доступные пространства">
        <q-item
          v-for="space in spaces"
          :key="space.id"
          v-ripple
          clickable
          :to="spacePath(space.id)"
          data-test="space-link"
        >
          <q-item-section avatar>
            <q-icon name="workspaces" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">
              {{ space.name }}
            </q-item-label>
            <q-item-label v-if="space.description" caption>
              {{ space.description }}
            </q-item-label>
            <q-item-label caption>
              {{ space.projects.length }} проектов · {{ space.members.length }} участников
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="chevron_right" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </section>
</template>
