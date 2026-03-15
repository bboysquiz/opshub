import { mount } from '@vue/test-utils';
import { createSlotStub } from '../../../../tests/mocks/componentStubs';
import AboutPage from './about.vue';

vi.mock('@opshub/shared-ui', () => ({
  OpPageHeader: createSlotStub('OpPageHeader'),
  OpPanel: createSlotStub('OpPanel'),
}));

describe('about page', () => {
  it('renders the updated architecture and tooling sections', () => {
    const wrapper = mount(AboutPage);
    const setupState = (wrapper.vm as { $?: { setupState?: Record<string, unknown> } }).$
      ?.setupState;
    const patterns = setupState?.patterns as Array<{ title: string }> | undefined;
    const toolingCards = setupState?.toolingCards as Array<{ title: string }> | undefined;

    expect(wrapper.text()).toContain('О проекте');
    expect(patterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'GSAP' }),
        expect.objectContaining({ title: 'Custom directive' }),
      ]),
    );
    expect(toolingCards).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'pnpm workspace' })]),
    );
  });
});
