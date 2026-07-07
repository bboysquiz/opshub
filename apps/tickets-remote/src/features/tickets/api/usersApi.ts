import { http } from './http';

export type AssignableUser = {
  id: string;
  email: string;
  role: 'admin' | 'agent' | 'employee';
};

export type AssignableUsersFilter = {
  spaceId?: string;
  projectId?: string;
};

function toAssignableUsersPath(filter: AssignableUsersFilter = {}) {
  const params = new URLSearchParams();

  if (filter.spaceId) {
    params.set('spaceId', filter.spaceId);
  }

  if (filter.projectId) {
    params.set('projectId', filter.projectId);
  }

  const query = params.toString();
  return query ? `/users/options?${query}` : '/users/options';
}

export const usersApi = {
  async listAssignable(filter?: AssignableUsersFilter): Promise<AssignableUser[]> {
    const data = await http<{ items: AssignableUser[] }>(toAssignableUsersPath(filter));
    return data.items;
  },
};
