<template>
  <ClientOnly>
    <q-layout view="hHh LpR fFf">
      <q-header elevated>
        <q-toolbar>
          <q-btn
            flat
            dense
            round
            icon="menu"
            aria-label="Переключение меню"
            @click="ui.toggleDrawer()"
          />
          <q-toolbar-title>OpsHub</q-toolbar-title>

          <q-space />

          <div v-if="auth.currentUser" class="row items-center q-gutter-sm q-mr-md">
            <div class="text-caption text-white">
              {{ auth.currentUser.email }}
            </div>
            <q-badge color="secondary">
              {{ roleLabel }}
            </q-badge>
          </div>

          <q-btn
            v-if="auth.currentUser"
            flat
            dense
            color="white"
            icon="logout"
            label="Выйти"
            @click="handleLogout"
          />
          <q-btn v-else flat dense color="white" icon="login" label="Войти" to="/profile" />

          <q-toggle
            v-model="ui.darkMode"
            checked-icon="dark_mode"
            unchecked-icon="light_mode"
            color="primary"
            keep-color
            :aria-label="ui.darkMode ? 'Выключить тёмную тему' : 'Включить тёмную тему'"
          />
        </q-toolbar>
      </q-header>

      <q-drawer v-model="ui.leftDrawerOpen" show-if-above bordered :width="280">
        <q-list padding>
          <q-item-label header class="text-uppercase"> Рабочее пространство </q-item-label>

          <q-item v-if="auth.isAuthenticated" v-ripple clickable to="/tickets">
            <q-item-section avatar>
              <q-icon name="confirmation_number" />
            </q-item-section>
            <q-item-section>Тикеты</q-item-section>
          </q-item>

          <q-item v-ripple clickable to="/kb">
            <q-item-section avatar>
              <q-icon name="menu_book" />
            </q-item-section>
            <q-item-section>База знаний</q-item-section>
          </q-item>

          <q-item v-if="auth.canViewAnalytics" v-ripple clickable to="/analytics">
            <q-item-section avatar>
              <q-icon name="query_stats" />
            </q-item-section>
            <q-item-section>Аналитика</q-item-section>
          </q-item>

          <q-item v-if="auth.isAuthenticated" v-ripple clickable to="/notifications">
            <q-item-section avatar>
              <q-icon name="notifications_active" />
            </q-item-section>
            <q-item-section>Уведомления</q-item-section>
          </q-item>

          <q-separator spaced />

          <q-item v-ripple clickable to="/profile">
            <q-item-section avatar>
              <q-icon name="account_circle" />
            </q-item-section>
            <q-item-section>
              {{ auth.isAuthenticated ? 'Профиль и настройки' : 'Вход и профиль' }}
            </q-item-section>
          </q-item>

          <q-separator spaced />

          <q-item v-ripple clickable to="/about">
            <q-item-section avatar>
              <q-icon name="info" />
            </q-item-section>
            <q-item-section>О проекте</q-item-section>
          </q-item>
        </q-list>
      </q-drawer>

      <q-page-container>
        <q-page class="q-pa-md">
          <slot />
        </q-page>
      </q-page-container>
    </q-layout>

    <template #fallback>
      <div class="q-pa-md">
        <slot />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { computed, watch } from 'vue';
import { navigateTo } from '#imports';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { roleLabels } from '~/utils/access';

const $q = useQuasar();
const auth = useAuthStore();
const ui = useUiStore();

const roleLabel = computed(() => (auth.currentUser ? roleLabels[auth.currentUser.role] : ''));

async function handleLogout() {
  await auth.logout();
  await navigateTo('/profile');
}

if (import.meta.client) {
  watch(
    () => $q.screen.gt.sm,
    (isDesktop) => {
      ui.setDrawer(isDesktop);
    },
    { immediate: true },
  );
}
</script>
