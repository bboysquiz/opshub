import { watch } from 'vue';
import { useUiStore } from '~/stores/ui';
import { Dark, installQuasar } from '~/utils/quasar';

export default defineNuxtPlugin((nuxtApp) => {
  installQuasar(
    nuxtApp.vueApp,
    import.meta.server
      ? {
          req: nuxtApp.ssrContext?.event.node.req,
          res: nuxtApp.ssrContext?.event.node.res,
          _modules: [],
          onRendered: () => {},
        }
      : undefined,
  );

  if (import.meta.client) {
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
  }
});
