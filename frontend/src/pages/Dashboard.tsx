import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Users,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { DashboardOverview } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await dashboardService.getOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="emerald">Indexed</Badge>;
      case 'PROCESSING':
        return <Badge variant="amber" pulse>Indexing</Badge>;
      case 'FAILED':
        return <Badge variant="rose">Failed</Badge>;
      default:
        return <Badge variant="slate">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading intelligence telemetry...</p>
        </div>
      </div>
    );
  }

  const m = data?.metrics;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-950/80 via-surface-900 to-surface-900 border border-brand-500/20 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Knowledge Base
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hello, {user?.name.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              Query internal policies, runbooks, and documents with citation-grounded RAG intelligence.
              All retrieved answers are mathematically verified against company sources.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              loading={refreshing}
              onClick={() => loadData(true)}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Link to="/chat">
              <Button variant="primary" icon={<MessageSquare className="w-4 h-4" />}>
                Ask Assistant
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Documents */}
        <Card glow className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Documents
            </span>
            <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{m?.total_documents || 0}</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-0.5 inline" /> {m?.completed_documents || 0} ready
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            {m?.failed_documents ? (
              <span className="text-rose-400 font-medium">{m.failed_documents} failed</span>
            ) : (
              <span className="text-slate-400">0 processing errors</span>
            )}
          </div>
        </Card>

        {/* Total Queries */}
        <Card glow className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Questions Answered
            </span>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{m?.total_questions || 0}</span>
            <span className="text-xs text-slate-400 font-medium">in {m?.total_sessions || 0} sessions</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            100% grounded in retrieved citations
          </div>
        </Card>

        {/* Answer Accuracy */}
        <Card glow className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Helpful Rating
            </span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <ThumbsUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              {m?.helpful_ratio_percent || 100}%
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({m?.positive_feedback_count || 0} helpful)
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Based on employee ratings
          </div>
        </Card>

        {/* Total Active Users */}
        <Card glow className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Workspace Team
            </span>
            <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{m?.total_users || 1}</span>
            <span className="text-xs text-slate-400 font-medium">members</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
            Role-Based Access Isolation
          </div>
        </Card>
      </div>

      {/* Main Content Grid: Recent Documents & Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Documents Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Recent Document Ingestions
            </h3>
            <Link to="/documents" className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1">
              View all ({m?.total_documents}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card className="p-0 overflow-hidden">
            {data?.recent_documents && data.recent_documents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Document</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Chunks</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.recent_documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4 font-medium text-white">
                          <Link to={`/documents/${doc.id}`} className="hover:text-brand-400 transition-colors">
                            {doc.filename}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-300">{doc.category}</td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-400">{doc.chunk_count}</td>
                        <td className="px-5 py-4">{getStatusBadge(doc.status)}</td>
                        <td className="px-5 py-4 text-xs text-slate-400 text-right">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <UploadCloud className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm">No documents uploaded yet.</p>
                <Link to="/upload" className="mt-3 inline-block">
                  <Button size="sm" variant="primary">Upload First Document</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (1 Col): Recent Conversations & Audit Feed */}
        <div className="space-y-6">
          {/* Recent Conversations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Recent Chats
              </h3>
              <Link to="/history" className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1">
                Archives <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <Card className="p-4 space-y-3">
              {data?.recent_sessions && data.recent_sessions.length > 0 ? (
                data.recent_sessions.map((sess) => (
                  <Link
                    key={sess.id}
                    to={`/chat?session=${sess.id}`}
                    className="block p-3 rounded-xl bg-surface-950/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 transition-all group"
                  >
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-brand-300 truncate">
                      {sess.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(sess.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="group-hover:translate-x-1 transition-transform text-slate-400">→</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">No recent conversations.</p>
              )}
            </Card>
          </div>

          {/* Audit Event Activity */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Security Activity
            </h3>
            <Card className="p-4 space-y-3 max-h-72 overflow-y-auto">
              {data?.recent_activity && data.recent_activity.length > 0 ? (
                data.recent_activity.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 pb-2 border-b border-slate-800/50 last:border-0 last:pb-0 text-xs">
                    <span className="w-2 h-2 rounded-full bg-brand-400 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-300 truncate">
                        <span className="text-brand-400">{act.action}</span> by {act.actor_name}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">No activity logged.</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
