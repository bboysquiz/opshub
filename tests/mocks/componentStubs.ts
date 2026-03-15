/* eslint-disable vue/one-component-per-file */

import { defineComponent, h } from 'vue';

export function createSlotStub(name: string) {
  return defineComponent({
    name,
    props: {
      id: { type: String, default: '' },
      title: { type: String, default: '' },
      subtitle: { type: String, default: '' },
      caption: { type: String, default: '' },
      label: { type: String, default: '' },
    },
    setup(props) {
      return () =>
        h('div', { 'data-stub': name }, [
          props.id,
          props.title,
          props.subtitle,
          props.caption,
          props.label,
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
    setup(props) {
      return () => h('div', { 'data-quasar': name }, [props.id, props.title, props.label]);
    },
  });
}

export function createQuasarComponentStubs(names: string[]) {
  return Object.fromEntries(names.map((name) => [name, createQuasarComponentStub(name)]));
}
