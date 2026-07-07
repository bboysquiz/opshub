const { http } = vi.hoisted(() => ({
  http: vi.fn(),
}));

vi.mock('./http', () => ({
  http,
}));

import { spacesApi } from './spacesApi';

describe('tickets spaces api', () => {
  beforeEach(() => {
    http.mockReset();
  });

  it('loads ticket project options from accessible spaces and skips archived projects', async () => {
    http.mockResolvedValueOnce({
      items: [
        {
          id: 'space-1',
          name: 'Ops',
          projects: [
            {
              id: 'project-1',
              spaceId: 'space-1',
              name: 'Support',
              archivedAt: null,
            },
            {
              id: 'project-archived',
              spaceId: 'space-1',
              name: 'Archived',
              archivedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
        {
          id: 'space-2',
          name: 'Billing',
          projects: [
            {
              id: 'project-2',
              spaceId: 'space-2',
              name: 'Payments',
              archivedAt: null,
            },
          ],
        },
      ],
    });

    await expect(spacesApi.listTicketProjects()).resolves.toEqual([
      {
        projectId: 'project-1',
        projectName: 'Support',
        spaceId: 'space-1',
        spaceName: 'Ops',
      },
      {
        projectId: 'project-2',
        projectName: 'Payments',
        spaceId: 'space-2',
        spaceName: 'Billing',
      },
    ]);
    expect(http).toHaveBeenCalledWith('/spaces');
  });
});
