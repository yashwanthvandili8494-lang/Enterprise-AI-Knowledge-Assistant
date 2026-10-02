import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  UploadCloud,
  Trash2,
  RotateCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { docService } from '../services/docService';
import { DocumentItem } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await docService.list({
        query: query || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        page,
        page_size: 10,
      });
      setDocuments(res.items);
      setTotalCount(res.total);
    } catch (err) {
      toast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [selectedCategory, selectedStatus, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadDocuments();
  };

  const handleRetry = async (docId: string) => {
    try {
      await docService.retry(docId);
      toast('Document indexing re-queued', 'info');
      loadDocuments();
    } catch {
      toast('Retry failed', 'error');
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${filename}'?`)) return;
    try {
      await docService.delete(docId);
      toast(`Deleted '${filename}'`, 'success');
      loadDocuments();
    } catch {
      toast('Could not delete document', 'error');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="emerald">Indexed</Badge>;
      case 'PROCESSING':
        return <Badge variant="amber" pulse>Processing</Badge>;
      case 'FAILED':
        return <Badge variant="rose">Failed</Badge>;
      default:
        return <Badge variant="slate">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Knowledge Base</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse, manage, and inspect vectorized company documents and policies.
          </p>
        </div>
        <Link to="/upload">
          <Button variant="primary" icon={<UploadCloud className="w-4 h-4" />}>
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents by title or topic..."
              className="w-full pl-10 pr-4 py-2 bg-surface-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-surface-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Categories</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Engineering Operations">Engineering Operations</option>
              <option value="Information Security">Information Security</option>
              <option value="General">General</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-surface-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Indexed</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>

            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Documents Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading documents...</p>
          </div>
        ) : documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Document Title</th>
                  <th className="px-5 py-4">Category & Tags</th>
                  <th className="px-5 py-4">Size</th>
                  <th className="px-5 py-4">Chunks</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Uploader</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800/80 rounded-lg text-slate-400">
                          <FileText className="w-4 h-4 text-brand-400" />
                        </div>
                        <div>
                          <Link
                            to={`/documents/${doc.id}`}
                            className="font-medium text-white hover:text-brand-300 transition-colors"
                          >
                            {doc.filename}
                          </Link>
                          <p className="text-[11px] text-slate-500">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span className="text-xs text-slate-300 font-medium">{doc.category}</span>
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.slice(0, 3).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 bg-slate-800 text-[10px] text-slate-400 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs font-mono text-slate-400">
                      {formatFileSize(doc.file_size)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-brand-400" />
                        {doc.chunk_count}
                      </span>
                    </td>

                    <td className="px-5 py-4">{getStatusBadge(doc.status)}</td>

                    <td className="px-5 py-4 text-xs text-slate-400">
                      {doc.uploader_name || 'System'}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="Inspect Chunks"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {(hasRole('ADMIN') || hasRole('KNOWLEDGE_MANAGER')) && (
                          <>
                            {doc.status === 'FAILED' && (
                              <button
                                onClick={() => handleRetry(doc.id)}
                                className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                title="Retry Indexing"
                              >
                                <RotateCw className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(doc.id, doc.filename)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium">No matching documents found.</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or upload a new document.</p>
          </div>
        )}

        {/* Pagination Bar */}
        {totalCount > 10 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {documents.length} of {totalCount} documents
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 10 >= totalCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
