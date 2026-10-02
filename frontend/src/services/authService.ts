import { api } from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    return res.data;
  },

  async register(data: { name: string; email: string; password: string; organization_name?: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', data);
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  async getMe(): Promise<User> {
    const res = await api.get<User>('/auth/me');
    localStorage.setItem('user', JSON.stringify(res.data));
    return res.data;
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }
};
