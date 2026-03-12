import { QCard, QCardSection, type QCardProps } from 'quasar';
import { computed, defineComponent, h, type PropType } from 'vue';

export default defineComponent({
  name: 'OpPanel',
  inheritAttrs: false,
  props: {
    title: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      default: '',
    },
    tag: {
      type: String as PropType<keyof HTMLElementTagNameMap>,
      default: 'section',
    },
    cardProps: {
      type: Object as PropType<Partial<QCardProps>>,
      default: () => ({}),
    },
  },
  setup(props, { attrs, slots }) {
    const hasHeader = computed(() => Boolean(props.title || props.caption || slots.header));

    return () =>
      h(
        QCard,
        {
          flat: true,
          bordered: true,
          ...props.cardProps,
          ...attrs,
          class: ['op-panel', attrs.class],
        },
        {
          default: () => [
            hasHeader.value
              ? h(
                  QCardSection,
                  { class: 'op-panel__header' },
                  {
                    default: () =>
                      slots.header
                        ? slots.header()
                        : h(props.tag, { class: 'op-panel__heading' }, [
                            props.title
                              ? h('div', { class: 'op-panel__title' }, props.title)
                              : null,
                            props.caption
                              ? h('div', { class: 'op-panel__caption' }, props.caption)
                              : null,
                          ]),
                  },
                )
              : null,
            h(
              QCardSection,
              { class: 'op-panel__content' },
              {
                default: () => (slots.default ? slots.default() : null),
              },
            ),
          ],
        },
      );
  },
});
