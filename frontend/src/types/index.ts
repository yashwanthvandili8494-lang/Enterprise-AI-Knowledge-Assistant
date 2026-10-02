export type UserRole = 'ADMIN' | 'KNOWLEDGE_MANAGER' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization_id: string;
  organization_name?: string;
  is_active: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface DocumentItem {
  id: string;
  organization_id: string;
  uploaded_by?: string;
  uploader_name?: string;
  filename: string;
  content_type: string;
  file_size: number;
  checksum: string;
  status: DocumentStatus;
  category: string;
  tags: string[];
  chunk_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number?: number;
  chunk_metadata: Record<string, any>;
  created_at: string;
}

export interface DocumentPermission {
  id: string;
  document_id: string;
  user_id?: string;
  user_email?: string;
  role?: string;
  permission: string;
  created_at: string;
}

export interface Citation {
  document_id: string;
  document_name: string;
  chunk_id: string;
  page_number?: number;
  excerpt: string;
  similarity?: number;
}

export interface Feedback {
  id: string;
  message_id: string;
  user_id: string;
  rating: number; // 1 or -1
  comment?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  retrieved_sources: Citation[];
  created_at: string;
  feedback?: Feedback;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  messages?: ChatMessage[];
}

export interface OverviewMetrics {
  total_documents: number;
  completed_documents: number;
  failed_documents: number;
  pending_documents: number;
  total_questions: number;
  total_sessions: number;
  total_users: number;
  positive_feedback_count: number;
  negative_feedback_count: number;
  helpful_ratio_percent: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  actor_name?: string;
  created_at: string;
}

export interface DashboardOverview {
  metrics: OverviewMetrics;
  recent_documents: DocumentItem[];
  recent_sessions: ChatSession[];
  recent_activity: RecentActivityItem[];
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_user_id?: string;
  actor_name?: string;
  actor_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  audit_metadata: Record<string, any>;
  ip_address?: string;
  created_at: string;
}
