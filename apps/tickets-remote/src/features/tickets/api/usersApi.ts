import { http } from './http';

export type AssignableUser = {
  id: string;
  email: string;
  role: 'admin' | 'agent' | 'employee';
};

export const usersApi = {
  async listAssignable(): Promise<AssignableUser[]> {
    const data = await http<{ items: AssignableUser[] }>('/users/options');
    return data.items;
  },
};
