import {
  Dark,
  QBanner,
  QBtn,
  QCard,
  QCardSection,
  QDrawer,
  QHeader,
  QIcon,
  QItem,
  QItemLabel,
  QItemSection,
  QLayout,
  QList,
  QPage,
  QPageContainer,
  QSeparator,
  QSpace,
  QSpinner,
  QToggle,
  QToolbar,
  QToolbarTitle,
  Quasar,
  Ripple,
} from 'quasar';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import type { App } from 'vue';

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
  components: {
    QBanner,
    QBtn,
    QCard,
    QCardSection,
    QDrawer,
    QHeader,
    QIcon,
    QItem,
    QItemLabel,
    QItemSection,
    QLayout,
    QList,
    QPage,
    QPageContainer,
    QSeparator,
    QSpace,
    QSpinner,
    QToggle,
    QToolbar,
    QToolbarTitle,
  },
  directives: {
    Ripple,
  },
  plugins: {},
};

export { Dark };

export function installQuasar(app: App, ssrContext?: QuasarSsrContext) {
  if (ssrContext) {
    (Quasar as QuasarWithSsrInstall).install(app, quasarOptions, ssrContext);
    return;
  }

  app.use(Quasar, quasarOptions);
}
