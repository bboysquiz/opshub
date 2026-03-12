import { defineComponent, h } from 'vue';

export default defineComponent({
  name: 'OpPageHeader',
  props: {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      default: '',
    },
    as: {
      type: String,
      default: 'header',
    },
  },
  setup(props, { slots }) {
    return () =>
      h(props.as, { class: 'op-page-header' }, [
        h('div', { class: 'op-page-header__main' }, [
          h('h1', { class: 'op-page-header__title' }, props.title),
          props.subtitle ? h('p', { class: 'op-page-header__subtitle' }, props.subtitle) : null,
        ]),
        slots.meta ? h('div', { class: 'op-page-header__meta' }, slots.meta()) : null,
        slots.actions ? h('div', { class: 'op-page-header__actions' }, slots.actions()) : null,
      ]);
  },
});
