import { flushPromises, shallowMount } from '@vue/test-utils';
import {
  createQuasarComponentStubs,
  createSlotStub,
} from '../../../../../../tests/mocks/componentStubs';

const { kbStore, notifyWithPush, quasarNotify, dialogCreate } = vi.hoisted(() => ({
  kbStore: {
    query: '',
    current: null,
    list: [
      {
        id: 'article-1',
        slug: 'onboarding',
        title: 'Онбординг',
        content: 'Контент',
        updatedAt: '2025-01-01T10:00:00.000Z',
        createdAt: '2025-01-01T09:00:00.000Z',
      },
    ],
    results: [],
    error: null,
    loadingList: false,
    loadingArticle: false,
    searching: false,
    loadList: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(undefined),
    setQuery: vi.fn().mockResolvedValue(undefined),
    createArticle: vi.fn().mockResolvedValue(undefined),
    updateArticle: vi.fn().mockResolvedValue(undefined),
    deleteArticle: vi.fn().mockResolvedValue(undefined),
  },
  notifyWithPush: vi.fn(),
  quasarNotify: vi.fn(),
  dialogCreate: vi.fn(() => ({
    onOk: vi.fn(),
  })),
}));

vi.mock('quasar', async () => {
  return {
    ...createQuasarComponentStubs([
      'QBanner',
      'QBtn',
      'QIcon',
      'QInput',
      'QItem',
      'QItemLabel',
      'QItemSection',
      'QList',
      'QSeparator',
      'QSpinner',
    ]),
    useQuasar: () => ({
      notify: quasarNotify,
    }),
    Dialog: {
      create: dialogCreate,
    },
  };
});

vi.mock('../stores/kb', () => ({
  useKbStore: () => kbStore,
}));

vi.mock('@opshub/shared-ui', async () => {
  return {
    OpPageHeader: createSlotStub('OpPageHeader'),
    OpPanel: createSlotStub('OpPanel'),
    notifyWithPush,
  };
});

import KbPage from './KbPage.vue';

describe('KbPage', () => {
  it('loads the article list and renders knowledge base sections', async () => {
    const wrapper = shallowMount(KbPage, {
      props: {
        userRole: 'admin',
      },
    });
    await flushPromises();

    expect(kbStore.loadList).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('База знаний');
    expect(kbStore.list).toHaveLength(1);
  });
});
