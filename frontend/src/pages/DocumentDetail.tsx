import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Layers,
  ShieldCheck,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Tag,
  Key,
} from 'lucide-react';
import { docService } from '../services/docService';
import { DocumentItem, DocumentChunk, DocumentPermission } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chunks' | 'permissions'>('chunks');
  const [newPermRole, setNewPermRole] = useState('EMPLOYEE');
  const [newPermType, setNewPermType] = useState('READ');
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [docData, chunksData, permsData] = await Promise.all([
        docService.get(id),
        docService.getSources(id),
        docService.getPermissions(id).catch(() => []),
      ]);
      setDoc(docData);
      setChunks(chunksData);
      setPermissions(permsData);
    } catch {
      toast('Failed to load document details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRetry = async () => {
    if (!id) return;
    try {
      await docService.retry(id);
      toast('Document indexing re-queued', 'info');
      loadData();
    } catch {
      toast('Retry failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!doc || !window.confirm(`Permanently delete '${doc.filename}' and its vector embeddings?`)) return;
    try {
      await docService.delete(doc.id);
      toast('Document deleted', 'success');
      navigate('/documents');
    } catch {
      toast('Failed to delete document', 'error');
    }
  };

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await docService.addPermission(id, {
        role: newPermRole,
        permission: newPermType,
      });
      toast(`Access rule granted to role '${newPermRole}'`, 'success');
      const updated = await docService.getPermissions(id);
      setPermissions(updated);
    } catch {
      toast('Could not add permission', 'error');
    }
  };

  const handleRemovePermission = async (permId: string) => {
    if (!id) return;
    try {
      await docService.removePermission(id, permId);
      toast('Permission revoked', 'info');
      setPermissions(permissions.filter((p) => p.id !== permId));
    } catch {
      toast('Could not revoke permission', 'error');
    }
  };

  if (loading || !doc) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/documents"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{doc.filename}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Category: <span className="text-slate-200">{doc.category}</span> • ID: {doc.id}
            </p>
          </div>
        </div>

        {(hasRole('ADMIN') || hasRole('KNOWLEDGE_MANAGER')) && (
          <div className="flex items-center gap-2">
            {doc.status === 'FAILED' && (
              <Button variant="secondary" size="sm" onClick={handleRetry} icon={<RotateCw className="w-4 h-4" />}>
                Retry Indexing
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={handleDelete} icon={<Trash2 className="w-4 h-4" />}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Metadata Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Processing Status
          </span>
          <div className="mt-2 flex items-center gap-2">
            {doc.status === 'COMPLETED' ? (
              <Badge variant="emerald">Indexed</Badge>
            ) : doc.status === 'PROCESSING' ? (
              <Badge variant="amber" pulse>Processing</Badge>
            ) : doc.status === 'FAILED' ? (
              <Badge variant="rose">Failed</Badge>
            ) : (
              <Badge variant="slate">Pending</Badge>
            )}
          </div>
          {doc.error_message && (
            <p className="text-xs text-rose-400 mt-2 font-mono">{doc.error_message}</p>
          )}
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Indexed Chunks
          </span>
          <div className="mt-2 text-2xl font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-400" />
            {doc.chunk_count}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">768-dim embeddings stored</p>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            File Size & Format
          </span>
          <div className="mt-2 text-sm font-semibold text-white">
            {(doc.file_size / 1024).toFixed(1)} KB ({doc.content_type})
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
          </p>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            SHA-256 Checksum
          </span>
          <div className="mt-2 text-xs font-mono text-slate-300 truncate" title={doc.checksum}>
            {doc.checksum}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">Deduplication verified</p>
        </Card>
      </div>

      {/* Tabs: Chunks vs Access Control */}
      <div className="border-b border-slate-800 flex gap-6">
        <button
          onClick={() => setActiveTab('chunks')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'chunks' ? 'text-brand-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          Extracted Chunks ({chunks.length})
          {activeTab === 'chunks' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('permissions')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'permissions' ? 'text-brand-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          Access Permissions ({permissions.length})
          {activeTab === 'permissions' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: Extracted Chunks Viewer */}
      {activeTab === 'chunks' && (
        <div className="space-y-4">
          {chunks.length > 0 ? (
            chunks.map((chunk) => (
              <Card key={chunk.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo" size="sm">Chunk #{chunk.chunk_index + 1}</Badge>
                    <span>Page {chunk.page_number || 1}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">ID: {chunk.id.slice(0, 8)}...</span>
                </div>
                <p className="text-sm font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {chunk.content}
                </p>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center text-slate-400">
              <Layers className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">No chunks generated yet.</p>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Document Permissions */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {(hasRole('ADMIN') || hasRole('KNOWLEDGE_MANAGER')) && (
            <Card className="p-5">
              <h4 className="text-sm font-semibold text-white mb-3">Add Access Rule</h4>
              <form onSubmit={handleAddPermission} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <select
                    value={newPermRole}
                    onChange={(e) => setNewPermRole(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white"
                  >
                    <option value="EMPLOYEE">Role: EMPLOYEE (Standard Staff)</option>
                    <option value="KNOWLEDGE_MANAGER">Role: KNOWLEDGE_MANAGER</option>
                    <option value="ADMIN">Role: ADMIN (Full Control)</option>
                    <option value="ALL">Everyone in Organization</option>
                  </select>
                </div>
                <div>
                  <select
                    value={newPermType}
                    onChange={(e) => setNewPermType(e.target.value)}
                    className="px-3 py-2 bg-surface-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white"
                  >
                    <option value="READ">READ (Search & Chat)</option>
                    <option value="WRITE">WRITE (Edit metadata)</option>
                    <option value="ADMIN">ADMIN (Full Rights)</option>
                  </select>
                </div>
                <Button type="submit" variant="primary" size="sm">
                  Grant Access
                </Button>
              </form>
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            {permissions.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Granted To</th>
                    <th className="px-5 py-3">Access Level</th>
                    <th className="px-5 py-3">Assigned Date</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {permissions.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3.5 font-medium text-white">
                        {p.role ? `Role: ${p.role}` : p.user_email || 'User'}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="indigo">{p.permission}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleRemovePermission(p.id)}
                          className="text-xs text-rose-400 hover:text-rose-300"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No explicit restrictions. Visible to all members of this organization.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
