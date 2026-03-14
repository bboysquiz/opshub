import { watch } from 'vue';
import { installSharedUiDirectives } from '@opshub/shared-ui';
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
  installSharedUiDirectives(nuxtApp.vueApp);

  if (import.meta.client) {
    const ui = useUiStore();
    ui.hydrateThemePreference();
    Dark.set(ui.darkMode);

    watch(
      () => ui.darkMode,
      (isDark) => {
        Dark.set(isDark);
        ui.persistThemePreference(isDark);
      },
      { immediate: true },
    );
  }
});
