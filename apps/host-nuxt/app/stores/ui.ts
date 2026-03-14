import { defineStore } from 'pinia';

const THEME_STORAGE_KEY = 'opshub:ui:dark-mode';

export const useUiStore = defineStore('ui', () => {
  const leftDrawerOpen = ref<boolean>(false);
  const darkMode = ref<boolean>(false);
  const themeHydrated = ref<boolean>(false);

  function readStoredDarkMode(): boolean | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const savedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedValue === 'true') {
      return true;
    }

    if (savedValue === 'false') {
      return false;
    }

    return null;
  }

  function hydrateThemePreference() {
    if (themeHydrated.value) {
      return;
    }

    const savedValue = readStoredDarkMode();
    if (savedValue !== null) {
      darkMode.value = savedValue;
    }

    themeHydrated.value = true;
  }

  function persistThemePreference(value = darkMode.value) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, String(value));
  }

  function toggleDrawer() {
    leftDrawerOpen.value = !leftDrawerOpen.value;
  }

  function setDrawer(value: boolean) {
    leftDrawerOpen.value = value;
  }

  function setDark(value: boolean) {
    darkMode.value = value;
  }

  return {
    leftDrawerOpen,
    darkMode,
    themeHydrated,
    hydrateThemePreference,
    persistThemePreference,
    toggleDrawer,
    setDrawer,
    setDark,
  };
});
