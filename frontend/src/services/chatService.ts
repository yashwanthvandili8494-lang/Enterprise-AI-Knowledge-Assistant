import { api } from './api';
import { ChatSession, ChatMessage, Feedback } from '../types';

export const chatService = {
  async createSession(title: string = 'New Conversation'): Promise<ChatSession> {
    const res = await api.post<ChatSession>('/chat/sessions', { title });
    return res.data;
  },

  async listSessions(): Promise<ChatSession[]> {
    const res = await api.get<ChatSession[]>('/chat/sessions');
    return res.data;
  },

  async getSession(sessionId: string): Promise<ChatSession> {
    const res = await api.get<ChatSession>(`/chat/sessions/${sessionId}`);
    return res.data;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/chat/sessions/${sessionId}`);
  },

  async sendMessage(sessionId: string, content: string): Promise<ChatMessage> {
    const res = await api.post<ChatMessage>(`/chat/sessions/${sessionId}/messages`, { content });
    return res.data;
  },

  async submitFeedback(messageId: string, rating: number, comment?: string): Promise<Feedback> {
    const res = await api.post<Feedback>(`/chat/messages/${messageId}/feedback`, {
      rating,
      comment,
    });
    return res.data;
  },
};
