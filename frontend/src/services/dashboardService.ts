import { api } from './api';
import { DashboardOverview } from '../types';

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const res = await api.get<DashboardOverview>('/dashboard/overview');
    return res.data;
  },

  async getUsage(): Promise<any> {
    const res = await api.get('/dashboard/usage');
    return res.data;
  },
};
