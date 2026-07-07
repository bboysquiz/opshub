import { useSpacesApi } from './useSpacesApi';

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}));

vi.mock('~/composables/useApiClient', () => ({
  useApiClient: () => ({
    apiRequest,
  }),
}));

describe('useSpacesApi', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('uses the shared apiRequest transport for list calls', async () => {
    apiRequest.mockResolvedValueOnce({ items: [] });

    await expect(useSpacesApi().listSpaces()).resolves.toEqual([]);

    expect(apiRequest).toHaveBeenCalledWith('/spaces');
  });

  it('routes project writes through csrf-protected spaces api calls', async () => {
    apiRequest.mockResolvedValueOnce({
      id: 'project-1',
      spaceId: 'space/1',
      name: 'Support',
      description: '',
      archivedAt: null,
      createdBy: null,
      createdByEmail: null,
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      members: [],
    });

    await useSpacesApi().createProject('space/1', {
      name: 'Support',
      description: 'L1',
    });

    expect(apiRequest).toHaveBeenCalledWith(
      '/spaces/space%2F1/projects',
      {
        method: 'POST',
        body: JSON.stringify({ name: 'Support', description: 'L1' }),
      },
      { csrf: true },
    );
  });

  it('routes membership and scoped user option calls through the shared transport', async () => {
    apiRequest
      .mockResolvedValueOnce({
        id: 'user/1',
        email: 'agent@example.com',
        role: 'agent',
        joinedAt: '2026-01-01T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'user/1',
            email: 'agent@example.com',
            role: 'agent',
          },
        ],
      });

    await useSpacesApi().addProjectMember('space/1', 'project/1', 'user/1');
    await expect(useSpacesApi().listUserOptionsBySpace('space/1')).resolves.toEqual([
      {
        id: 'user/1',
        email: 'agent@example.com',
        role: 'agent',
      },
    ]);

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      '/spaces/space%2F1/projects/project%2F1/members',
      {
        method: 'POST',
        body: JSON.stringify({ userId: 'user/1' }),
      },
      { csrf: true },
    );
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/users/options?spaceId=space%2F1');
  });
});
