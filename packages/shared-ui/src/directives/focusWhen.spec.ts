import type { DirectiveBinding } from 'vue';
import { focusWhenDirective } from './focusWhen';

function createVisibleRectList(): DOMRectList {
  return {
    length: 1,
    item: () => null,
    [Symbol.iterator]: function* iterator() {},
  } as DOMRectList;
}

describe('focusWhenDirective', () => {
  it('focuses the first nested focusable element when the binding becomes true', () => {
    vi.useFakeTimers();

    const host = document.createElement('div');
    const input = document.createElement('input');
    host.appendChild(input);
    document.body.appendChild(host);

    const focus = vi.spyOn(input, 'focus');
    vi.spyOn(input, 'getClientRects').mockReturnValue(createVisibleRectList());

    focusWhenDirective.updated?.(
      host,
      {
        value: true,
        oldValue: false,
        instance: null,
        dir: focusWhenDirective,
        modifiers: {},
      } as DirectiveBinding<boolean>,
      null as never,
      null as never,
    );

    vi.runAllTimers();

    expect(focus).toHaveBeenCalledTimes(1);

    document.body.removeChild(host);
    vi.useRealTimers();
  });
});
