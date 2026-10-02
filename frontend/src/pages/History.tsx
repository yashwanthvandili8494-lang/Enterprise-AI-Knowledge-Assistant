import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Trash2, ArrowUpRight, Search, Clock, Sparkles } from 'lucide-react';
import { chatService } from '../services/chatService';
import { ChatSession } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

export const History: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await chatService.listSessions();
      setSessions(data);
    } catch {
      toast('Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!window.confirm('Delete this conversation history?')) return;
    try {
      await chatService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast('Conversation removed', 'info');
    } catch {
      toast('Failed to delete conversation', 'error');
    }
  };

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Conversation Archives</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review past Q&A sessions with citations and retrieved evidence.
          </p>
        </div>
        <Link to="/chat">
          <Button variant="primary" icon={<MessageSquare className="w-4 h-4" />}>
            New Chat
          </Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversation topics..."
            className="w-full pl-10 pr-4 py-2 bg-surface-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading archives...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-slate-800/60">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 bg-slate-800 rounded-xl text-brand-400 shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/chat?session=${s.id}`}
                      className="font-semibold text-white hover:text-brand-300 text-sm truncate block"
                    >
                      {s.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(s.updated_at).toLocaleDateString()} at {new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>{s.message_count || 0} messages</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/chat?session=${s.id}`}>
                    <Button variant="outline" size="sm" icon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                      Resume
                    </Button>
                  </Link>
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium">No archived conversations found.</p>
            <Link to="/chat" className="mt-3 inline-block">
              <Button size="sm" variant="primary">Start a Chat</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};
