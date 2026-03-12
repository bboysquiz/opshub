import { onBeforeUnmount, onMounted, ref } from 'vue';

const MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion() {
  const reducedMotion = ref(false);
  let mediaQuery: MediaQueryList | null = null;

  const sync = () => {
    reducedMotion.value = mediaQuery?.matches ?? false;
  };

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    mediaQuery = window.matchMedia(MEDIA_QUERY);
    sync();
    mediaQuery.addEventListener('change', sync);
  });

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', sync);
  });

  return {
    reducedMotion,
  };
}
