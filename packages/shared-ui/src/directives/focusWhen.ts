import type { App, ObjectDirective } from 'vue';

const pendingFocusFrames = new WeakMap<HTMLElement, number>();

const focusableSelector = [
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'button:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function cancelScheduledFocus(el: HTMLElement) {
  const frameId = pendingFocusFrames.get(el);
  if (frameId === undefined || typeof window === 'undefined') {
    return;
  }

  window.cancelAnimationFrame(frameId);
  pendingFocusFrames.delete(el);
}

function resolveFocusTarget(el: HTMLElement) {
  if (el.matches(focusableSelector)) {
    return el;
  }

  return el.querySelector<HTMLElement>(focusableSelector);
}

function isVisible(el: HTMLElement) {
  return el.getClientRects().length > 0;
}

function focusTarget(el: HTMLElement, attempt = 0) {
  const target = resolveFocusTarget(el);
  if (!target) {
    pendingFocusFrames.delete(el);
    return;
  }

  if (typeof window !== 'undefined' && !isVisible(target) && attempt < 3) {
    const frameId = window.requestAnimationFrame(() => focusTarget(el, attempt + 1));
    pendingFocusFrames.set(el, frameId);
    return;
  }

  pendingFocusFrames.delete(el);
  target.focus();
}

function scheduleFocus(el: HTMLElement) {
  cancelScheduledFocus(el);

  if (typeof window === 'undefined') {
    focusTarget(el);
    return;
  }

  const frameId = window.requestAnimationFrame(() => focusTarget(el));
  pendingFocusFrames.set(el, frameId);
}

export const focusWhenDirective: ObjectDirective<HTMLElement, boolean> = {
  mounted(el, binding) {
    if (binding.value) {
      scheduleFocus(el);
    }
  },
  updated(el, binding) {
    if (binding.value && !binding.oldValue) {
      scheduleFocus(el);
      return;
    }

    if (!binding.value) {
      cancelScheduledFocus(el);
    }
  },
  beforeUnmount(el) {
    cancelScheduledFocus(el);
  },
};

export function installSharedUiDirectives(app: App) {
  app.directive('focus-when', focusWhenDirective);
}
