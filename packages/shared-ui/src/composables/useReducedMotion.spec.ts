import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useReducedMotion } from './useReducedMotion';

describe('useReducedMotion', () => {
  it('tracks media query changes and removes the listener on unmount', async () => {
    let state: ReturnType<typeof useReducedMotion> | undefined;
    let changeHandler: (() => void) | undefined;
    let matches = false;
    const mediaQuery: MediaQueryList = {
      get matches() {
        return matches;
      },
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } satisfies MediaQueryList;

    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQuery);

    const TestComponent = defineComponent({
      setup() {
        state = useReducedMotion();
        return state;
      },
      template: '<div>{{ reducedMotion }}</div>',
    });

    const wrapper = mount(TestComponent);

    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(changeHandler).toBeTypeOf('function');
    expect(state?.reducedMotion.value).toBe(false);

    matches = true;
    changeHandler?.();
    await nextTick();

    expect(state?.reducedMotion.value).toBe(true);

    wrapper.unmount();

    expect(mediaQuery.removeEventListener).toHaveBeenCalled();
  });
});
