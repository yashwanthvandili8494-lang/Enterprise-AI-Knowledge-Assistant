import { api } from './api';
import { User } from '../types';

export const userService = {
  async list(): Promise<User[]> {
    const res = await api.get<User[]>('/users');
    return res.data;
  },

  async get(id: string): Promise<User> {
    const res = await api.get<User>(`/users/${id}`);
    return res.data;
  },

  async updateRole(id: string, role: string): Promise<User> {
    const res = await api.patch<User>(`/users/${id}/role`, { role });
    return res.data;
  },

  async update(id: string, data: { name?: string; is_active?: boolean }): Promise<User> {
    const res = await api.patch<User>(`/users/${id}`, data);
    return res.data;
  },
};
