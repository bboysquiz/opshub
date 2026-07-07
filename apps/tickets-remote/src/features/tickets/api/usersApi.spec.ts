const { http } = vi.hoisted(() => ({
  http: vi.fn(),
}));

vi.mock('./http', () => ({
  http,
}));

import { usersApi } from './usersApi';

describe('tickets users api', () => {
  beforeEach(() => {
    http.mockReset();
  });

  it('loads assignee options through project-scoped users/options endpoint', async () => {
    http.mockResolvedValueOnce({
      items: [
        {
          id: 'agent-2',
          email: 'agent2@example.com',
          role: 'agent',
        },
      ],
    });

    await expect(usersApi.listAssignable({ projectId: 'project/2' })).resolves.toEqual([
      {
        id: 'agent-2',
        email: 'agent2@example.com',
        role: 'agent',
      },
    ]);
    expect(http).toHaveBeenCalledWith('/users/options?projectId=project%2F2');
  });

  it('keeps unfiltered options endpoint for screens that do not pass a project', async () => {
    http.mockResolvedValueOnce({ items: [] });

    await expect(usersApi.listAssignable()).resolves.toEqual([]);

    expect(http).toHaveBeenCalledWith('/users/options');
  });
});
