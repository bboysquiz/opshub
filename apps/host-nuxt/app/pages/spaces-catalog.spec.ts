import { flushPromises, shallowMount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nextTick, type Component } from 'vue';
import type { SpaceDto } from '~/utils/spacesApi';
import SpacesPage from './spaces.vue';
import SpacePage from './spaces/[spaceId].vue';
import ProjectPage from './spaces/[spaceId]/projects/[projectId].vue';

const { api, route } = vi.hoisted(() => ({
  api: {
    listSpaces: vi.fn(),
  },
  route: {
    params: {} as Record<string, string>,
  },
}));

vi.mock('#imports', () => ({
  useRoute: () => route,
}));

vi.mock('~/composables/useSpacesApi', () => ({
  useSpacesApi: () => api,
}));

const space: SpaceDto = {
  id: 'space-1',
  name: 'Операции',
  description: 'Рабочее пространство поддержки',
  createdBy: 'admin-1',
  createdByEmail: 'admin@example.com',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [],
  projects: [
    {
      id: 'project-1',
      spaceId: 'space-1',
      name: 'Поддержка',
      description: 'Обращения пользователей',
      archivedAt: null,
      createdBy: 'admin-1',
      createdByEmail: 'admin@example.com',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      members: [],
    },
  ],
};

function mountPage(component: Component) {
  return shallowMount(component, {
    global: {
      plugins: [createPinia()],
      stubs: {
        TicketsRemote: {
          name: 'TicketsRemote',
          props: ['initialSpaceId', 'initialProjectId'],
          template: '<div data-test="tickets-remote" />',
        },
      },
    },
  });
}

async function finishLoading() {
  await flushPromises();
  await nextTick();
}

describe('spaces catalog navigation', () => {
  beforeEach(() => {
    route.params = {};
    api.listSpaces.mockReset();
    api.listSpaces.mockResolvedValue([space]);
  });

  it('shows accessible spaces returned by the shared API store', async () => {
    const wrapper = mountPage(SpacesPage);
    await finishLoading();

    expect((wrapper.vm as unknown as { initializing: boolean }).initializing).toBe(false);
    expect(api.listSpaces).toHaveBeenCalledTimes(1);
    expect((wrapper.vm as unknown as { spaces: SpaceDto[] }).spaces).toEqual([space]);
  });

  it('shows projects for the selected space', async () => {
    route.params = { spaceId: 'space-1' };
    const wrapper = mountPage(SpacePage);
    await finishLoading();

    const vm = wrapper.vm as unknown as {
      space: SpaceDto | null;
      projectPath: (projectId: string) => string;
    };
    expect(vm.space).toEqual(space);
    expect(vm.projectPath('project-1')).toBe('/spaces/space-1/projects/project-1');
  });

  it('opens tickets with a strict space and project context', async () => {
    route.params = { spaceId: 'space-1', projectId: 'project-1' };
    const wrapper = mountPage(ProjectPage);
    await finishLoading();

    const vm = wrapper.vm as unknown as {
      project: SpaceDto['projects'][number] | null;
    };
    expect(vm.project?.name).toBe('Поддержка');

    const source = readFileSync(
      join(process.cwd(), 'apps/host-nuxt/app/pages/spaces/[spaceId]/projects/[projectId].vue'),
      'utf8',
    );
    expect(source).toContain(':initial-space-id="space.id"');
    expect(source).toContain(':initial-project-id="project.id"');
  });

  it('does not render project tickets when the project is outside the accessible space graph', async () => {
    route.params = { spaceId: 'space-1', projectId: 'project-unknown' };
    const wrapper = mountPage(ProjectPage);
    await finishLoading();

    expect(
      (wrapper.vm as unknown as { project: SpaceDto['projects'][number] | null }).project,
    ).toBeNull();
  });
});
