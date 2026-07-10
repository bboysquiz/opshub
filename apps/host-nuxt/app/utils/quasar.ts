import { ClosePopup, Dark, Dialog, Notify, Quasar, Ripple } from 'quasar';
import '@opshub/shared-ui/styles.css';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import type { App } from 'vue';
import { quasarComponents } from './quasarComponents';

type QuasarWithSsrInstall = typeof Quasar & {
  install: (app: App, opts?: object, ssrContext?: object) => void;
};

export type QuasarSsrContext = {
  req?: object;
  res?: object;
  _modules: unknown[];
  onRendered: () => void;
};

const quasarOptions = {
  components: quasarComponents,
  directives: {
    ClosePopup,
    Ripple,
  },
  plugins: {
    Notify,
    Dialog,
  },
};

export { Dark };

export function installQuasar(app: App, ssrContext?: QuasarSsrContext) {
  if (ssrContext) {
    (Quasar as QuasarWithSsrInstall).install(app, quasarOptions, ssrContext);
    return;
  }

  app.use(Quasar, quasarOptions);
}
