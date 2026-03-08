<template>
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
        <q-item-label header class="text-uppercase"> Workspace </q-item-label>

        <q-item v-ripple clickable to="/tickets">
          <q-item-section avatar>
            <q-icon name="confirmation_number" />
          </q-item-section>
          <q-item-section>Tickets</q-item-section>
        </q-item>

        <q-item v-ripple clickable to="/kb">
          <q-item-section avatar>
            <q-icon name="menu_book" />
          </q-item-section>
          <q-item-section>Knowledge Base</q-item-section>
        </q-item>

        <q-item v-ripple clickable to="/analytics">
          <q-item-section avatar>
            <q-icon name="query_stats" />
          </q-item-section>
          <q-item-section>Analytics</q-item-section>
        </q-item>

        <q-separator spaced />

        <q-item v-ripple clickable to="/profile">
          <q-item-section avatar>
            <q-icon name="account_circle" />
          </q-item-section>
          <q-item-section>Profile</q-item-section>
        </q-item>

        <q-separator spaced />

        <q-item v-ripple clickable to="/about">
          <q-item-section avatar>
            <q-icon name="info" />
          </q-item-section>
          <q-item-section>About</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <q-page class="q-pa-md">
        <slot />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useUiStore } from '~/stores/ui';
const ui = useUiStore();
</script>
