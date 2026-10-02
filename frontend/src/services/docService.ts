import { api } from './api';
import { DocumentItem, DocumentChunk, DocumentPermission } from '../types';

export interface DocumentListResult {
  items: DocumentItem[];
  total: number;
  page: number;
  page_size: number;
}

export const docService = {
  async list(params?: { query?: string; category?: string; status?: string; page?: number; page_size?: number }): Promise<DocumentListResult> {
    const res = await api.get<DocumentListResult>('/documents', { params });
    return res.data;
  },

  async get(id: string): Promise<DocumentItem> {
    const res = await api.get<DocumentItem>(`/documents/${id}`);
    return res.data;
  },

  async getStatus(id: string): Promise<{ id: string; status: string; chunk_count: number; error_message?: string }> {
    const res = await api.get(`/documents/${id}/status`);
    return res.data;
  },

  async getSources(id: string): Promise<DocumentChunk[]> {
    const res = await api.get<DocumentChunk[]>(`/documents/${id}/sources`);
    return res.data;
  },

  async upload(file: File, category: string = 'General', tags: string[] = []): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }
    const res = await api.post<DocumentItem>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async retry(id: string): Promise<DocumentItem> {
    const res = await api.post<DocumentItem>(`/documents/${id}/retry`);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  async update(id: string, data: { category?: string; tags?: string[] }): Promise<DocumentItem> {
    const res = await api.patch<DocumentItem>(`/documents/${id}`, data);
    return res.data;
  },

  async getPermissions(id: string): Promise<DocumentPermission[]> {
    const res = await api.get<DocumentPermission[]>(`/documents/${id}/permissions`);
    return res.data;
  },

  async addPermission(id: string, perm: { user_id?: string; role?: string; permission: string }): Promise<DocumentPermission> {
    const res = await api.post<DocumentPermission>(`/documents/${id}/permissions`, perm);
    return res.data;
  },

  async removePermission(id: string, permissionId: string): Promise<void> {
    await api.delete(`/documents/${id}/permissions/${permissionId}`);
  },
};
