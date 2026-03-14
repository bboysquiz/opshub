import { createPinia } from 'pinia';
import { Dialog, Notify, Quasar } from 'quasar';
import type { App } from 'vue';
import { installSharedUiDirectives } from '@opshub/shared-ui';

import '@opshub/shared-ui/styles.css';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';

export function installKbRemote(app: App) {
  app.use(createPinia());
  app.use(Quasar, {
    plugins: {
      Dialog,
      Notify,
    },
  });
  installSharedUiDirectives(app);
}
