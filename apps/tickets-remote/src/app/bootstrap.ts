import { createPinia } from 'pinia';
import { ClosePopup, Dialog, Notify, QTd, Quasar } from 'quasar';
import type { App } from 'vue';
import { installSharedUiDirectives } from '@opshub/shared-ui';

import '@opshub/shared-ui/styles.css';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';

export function installTicketsRemote(app: App) {
  app.use(createPinia());
  app.use(Quasar, {
    components: {
      QTd,
    },
    directives: {
      ClosePopup,
    },
    plugins: {
      Notify,
      Dialog,
    },
  });
  installSharedUiDirectives(app);
}
