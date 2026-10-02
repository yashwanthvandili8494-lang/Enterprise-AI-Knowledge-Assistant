import { api } from './api';
import { AuditLog } from '../types';

export interface AuditLogListResult {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

export const auditService = {
  async list(params?: { action?: string; resource_type?: string; page?: number; page_size?: number }): Promise<AuditLogListResult> {
    const res = await api.get<AuditLogListResult>('/audit', { params });
    return res.data;
  },
};
