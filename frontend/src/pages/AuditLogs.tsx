import React, { useState, useEffect } from 'react';
import { FileClock, Search, Shield, Filter, Eye } from 'lucide-react';
import { auditService } from '../services/auditService';
import { AuditLog } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { toast } = useToast();

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.list({
        action: actionFilter || undefined,
        resource_type: resourceFilter || undefined,
        page,
        page_size: 15,
      });
      setLogs(data.items);
      setTotalCount(data.total);
    } catch {
      toast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, resourceFilter, page]);

  const getActionBadge = (action: string) => {
    if (action.startsWith('AUTH_')) return <Badge variant="indigo">{action}</Badge>;
    if (action.startsWith('DOCUMENT_')) return <Badge variant="violet">{action}</Badge>;
    if (action.startsWith('USER_')) return <Badge variant="amber">{action}</Badge>;
    if (action.startsWith('CHAT_')) return <Badge variant="emerald">{action}</Badge>;
    return <Badge variant="slate">{action}</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Metadata Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Event Details"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-mono">
            <div className="p-3 bg-surface-950 rounded-xl space-y-1 text-slate-300">
              <p><strong className="text-white">Action:</strong> {selectedLog.action}</p>
              <p><strong className="text-white">Resource:</strong> {selectedLog.resource_type} ({selectedLog.resource_id})</p>
              <p><strong className="text-white">Actor:</strong> {selectedLog.actor_name} ({selectedLog.actor_email})</p>
              <p><strong className="text-white">IP Address:</strong> {selectedLog.ip_address || 'Internal'}</p>
              <p><strong className="text-white">Time:</strong> {selectedLog.created_at}</p>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">
                Event Metadata Payload:
              </span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedLog.audit_metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security Audit Trail</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Immutable event log tracking logins, document ingestions, deletions, queries, and permissions.
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3.5 py-2 bg-surface-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white"
          >
            <option value="">All Security Actions</option>
            <option value="AUTH_LOGIN">AUTH_LOGIN</option>
            <option value="AUTH_REGISTER">AUTH_REGISTER</option>
            <option value="AUTH_LOGOUT">AUTH_LOGOUT</option>
            <option value="DOCUMENT_UPLOAD">DOCUMENT_UPLOAD</option>
            <option value="DOCUMENT_DELETE">DOCUMENT_DELETE</option>
            <option value="DOCUMENT_RETRY">DOCUMENT_RETRY</option>
            <option value="CHAT_QUERY">CHAT_QUERY</option>
            <option value="USER_ROLE_CHANGE">USER_ROLE_CHANGE</option>
            <option value="FEEDBACK_SUBMIT">FEEDBACK_SUBMIT</option>
          </select>
        </div>

        <div className="flex-1">
          <select
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3.5 py-2 bg-surface-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white"
          >
            <option value="">All Resource Types</option>
            <option value="auth">auth</option>
            <option value="document">document</option>
            <option value="chat">chat</option>
            <option value="user">user</option>
            <option value="feedback">feedback</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading audit entries...</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Target Resource</th>
                  <th className="px-5 py-4">Actor</th>
                  <th className="px-5 py-4">IP Address</th>
                  <th className="px-5 py-4">Timestamp</th>
                  <th className="px-5 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">{getActionBadge(log.action)}</td>
                    <td className="px-5 py-3.5 text-slate-300">
                      <span className="font-sans font-semibold text-white">{log.resource_type}</span>
                      {log.resource_id && (
                        <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                          {log.resource_id}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-sans">
                      <span className="font-medium text-white">{log.actor_name || 'System'}</span>
                      {log.actor_email && <span className="text-[11px] text-slate-400 block">{log.actor_email}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-brand-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="View payload"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <FileClock className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium">No audit entries matching filter.</p>
          </div>
        )}

        {totalCount > 15 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {logs.length} of {totalCount} events</span>
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
                disabled={page * 15 >= totalCount}
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
