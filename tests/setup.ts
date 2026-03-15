import { afterEach, vi } from 'vitest';
import { config } from '@vue/test-utils';
import { createQuasarComponentStubs, createSlotStub } from './mocks/componentStubs';

const ignoredVueWarnings = [
  'resolveComponent can only be used in render() or setup().',
  'resolveDirective can only be used in render() or setup().',
  'withDirectives can only be used inside render functions.',
  'Missing ref owner context. ref cannot be used on hoisted vnodes.',
];
const originalConsoleWarn = console.warn.bind(console);

const quasarComponentNames = [
  'QBadge',
  'QBanner',
  'QBtn',
  'QCard',
  'QCardActions',
  'QCardSection',
  'QDate',
  'QDialog',
  'QDrawer',
  'QForm',
  'QHeader',
  'QIcon',
  'QInput',
  'QItem',
  'QItemLabel',
  'QItemSection',
  'QLayout',
  'QList',
  'QMenu',
  'QPage',
  'QPageContainer',
  'QPopupProxy',
  'QSelect',
  'QSeparator',
  'QSpace',
  'QSpinner',
  'QTable',
  'QTd',
  'QTime',
  'QToggle',
  'QToolbar',
  'QToolbarTitle',
];

config.global.stubs = {
  ClientOnly: createSlotStub('ClientOnly'),
  NuxtLink: createSlotStub('NuxtLink'),
  Bar: createSlotStub('Bar'),
  Doughnut: createSlotStub('Doughnut'),
  Line: createSlotStub('Line'),
  ...createQuasarComponentStubs(quasarComponentNames),
  ...Object.fromEntries(
    quasarComponentNames.map((name) => [
      name
        .replaceAll(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, ''),
      createSlotStub(name),
    ]),
  ),
};

config.global.config = {
  warnHandler(message, _instance, trace) {
    if (ignoredVueWarnings.some((warning) => message.includes(warning))) {
      return;
    }

    originalConsoleWarn(`[Vue warn]: ${message}${trace ? `\n${trace}` : ''}`);
  },
};

console.warn = (...args: unknown[]) => {
  const message = args.map((arg) => String(arg)).join(' ');

  if (ignoredVueWarnings.some((warning) => message.includes(warning))) {
    return;
  }

  originalConsoleWarn(...args);
};

class TestIntersectionObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
}

class TestResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
}

if (typeof window !== 'undefined') {
  window.requestAnimationFrame =
    window.requestAnimationFrame ??
    ((callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 0));
  window.cancelAnimationFrame =
    window.cancelAnimationFrame ?? ((id: number) => window.clearTimeout(id));
  window.scrollTo = window.scrollTo ?? (() => undefined);
  window.matchMedia =
    window.matchMedia ??
    (() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }));
}

globalThis.IntersectionObserver =
  TestIntersectionObserver as unknown as typeof IntersectionObserver;
globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.body.innerHTML = '';
});
