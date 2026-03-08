import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', () => {
  const leftDrawerOpen = ref<boolean>(true);
  const darkMode = ref<boolean>(false);

  function toggleDrawer() {
    leftDrawerOpen.value = !leftDrawerOpen.value;
  }

  function setDark(value: boolean) {
    darkMode.value = value;
  }

  return { leftDrawerOpen, darkMode, toggleDrawer, setDark };
});
