import { Quasar, Dark } from 'quasar';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import { useUiStore } from '~/stores/ui';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Quasar, { plugins: {} });

  nuxtApp.hook('app:mounted', () => {
    const ui = useUiStore();
    Dark.set(ui.darkMode);

    watch(
      () => ui.darkMode,
      (isDark) => {
        Dark.set(isDark);
      },
      { immediate: true },
    );
  });
});
