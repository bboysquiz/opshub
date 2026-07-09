/* eslint-disable vue/one-component-per-file */

import { defineComponent, h, type Slots } from 'vue';

const textPropNames = ['id', 'title', 'subtitle', 'caption', 'label'] as const;

function renderTextProps(props: Record<string, unknown>) {
  return textPropNames
    .map((name) => props[name])
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function renderSlots(slots: Slots, names: string[]) {
  return names.flatMap((name) => slots[name]?.() ?? []);
}

export function createSlotStub(name: string) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: {
      id: { type: String, default: '' },
      title: { type: String, default: '' },
      subtitle: { type: String, default: '' },
      caption: { type: String, default: '' },
      label: { type: String, default: '' },
    },
    setup(props, { attrs, slots }) {
      return () =>
        h('div', { ...attrs, 'data-stub': name }, [
          ...renderTextProps(props),
          ...renderSlots(slots, ['header', 'meta', 'actions', 'default', 'footer']),
        ]);
    },
  });
}

export function createQuasarComponentStub(name: string) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: {
      id: { type: String, default: '' },
      title: { type: String, default: '' },
      label: { type: String, default: '' },
      modelValue: { type: null, default: undefined },
    },
    emits: ['update:modelValue', 'click'],
    setup(props, { attrs, slots }) {
      return () =>
        h('div', { ...attrs, 'data-quasar': name }, [
          ...renderTextProps(props),
          ...renderSlots(slots, ['default']),
        ]);
    },
  });
}

export function createQuasarComponentStubs(names: string[]) {
  return Object.fromEntries(names.map((name) => [name, createQuasarComponentStub(name)]));
}
