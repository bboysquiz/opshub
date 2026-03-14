import { createPinia } from 'pinia';
import { Notify, Quasar } from 'quasar';
import type { App } from 'vue';
import { installSharedUiDirectives } from '@opshub/shared-ui';

import '@opshub/shared-ui/styles.css';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import { ensureAnalyticsChartsRegistered } from './charts';

export function installAnalyticsRemote(app: App) {
  ensureAnalyticsChartsRegistered();
  app.use(createPinia());
  app.use(Quasar, {
    plugins: {
      Notify,
    },
  });
  installSharedUiDirectives(app);
}
