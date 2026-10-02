import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  FileText,
  Sparkles,
  Bot,
  User as UserIcon,
  HelpCircle,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { chatService } from '../services/chatService';
import { ChatSession, ChatMessage, Citation } from '../types';
import { useToast } from '../context/ToastContext';
import { CitationModal } from '../components/common/CitationModal';
import { Badge } from '../components/common/Badge';

export const Chat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const exampleQuestions = [
    "What is our annual leave policy and how many days are allowed?",
    "Explain the production deployment procedure and rollback criteria.",
    "What are the steps for reporting a security incident under GDPR?",
    "What are the carry-over rules for unused vacation days?",
  ];

  const loadSessions = async () => {
    try {
      const list = await chatService.listSessions();
      setSessions(list);
      
      const querySession = searchParams.get('session');
      if (querySession && list.some((s) => s.id === querySession)) {
        selectSession(querySession);
      } else if (list.length > 0 && !currentSessionId) {
        selectSession(list[0].id);
      }
    } catch (err) {
      console.error('Error loading chat sessions', err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const selectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setSearchParams({ session: sessionId });
    try {
      const full = await chatService.getSession(sessionId);
      setMessages(full.messages || []);
    } catch (err) {
      toast('Failed to load conversation history', 'error');
    }
  };

  const handleNewSession = async () => {
    try {
      const created = await chatService.createSession('New Conversation');
      setSessions((prev) => [created, ...prev]);
      setCurrentSessionId(created.id);
      setMessages([]);
      setSearchParams({ session: created.id });
    } catch (err) {
      toast('Failed to initialize new conversation', 'error');
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await chatService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          selectSession(remaining[0].id);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
      toast('Chat session deleted', 'info');
    } catch (err) {
      toast('Could not delete session', 'error');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || sending) return;

    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
      try {
        const created = await chatService.createSession('New Conversation');
        setSessions((prev) => [created, ...prev]);
        setCurrentSessionId(created.id);
        targetSessionId = created.id;
      } catch {
        toast('Could not create session', 'error');
        return;
      }
    }

    // Optimistically append user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: targetSessionId,
      role: 'user',
      content: prompt,
      retrieved_sources: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInputPrompt('');
    setSending(true);

    try {
      const aiReply = await chatService.sendMessage(targetSessionId, prompt);
      setMessages((prev) => [...prev, aiReply]);
      // Update session title in sidebar list
      setSessions((prev) =>
        prev.map((s) => (s.id === targetSessionId ? { ...s, title: prompt.slice(0, 35) } : s))
      );
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Failed to retrieve answer from AI', 'error');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = async (messageId: string, rating: number) => {
    try {
      const updated = await chatService.submitFeedback(messageId, rating);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback: updated } : m))
      );
      toast(rating === 1 ? 'Marked as helpful' : 'Marked as unhelpful', 'info');
    } catch {
      toast('Could not record feedback', 'error');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] gap-4 overflow-hidden">
      {/* Citation Inspector Modal */}
      <CitationModal
        citation={selectedCitation}
        isOpen={!!selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />

      {/* Left Chat Sessions List */}
      <div className="w-72 hidden md:flex flex-col bg-surface-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl shrink-0">
        <button
          onClick={handleNewSession}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98] mb-4"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>

        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">
          Your Conversations
        </span>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => selectSession(s.id)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group ${
                currentSessionId === s.id
                  ? 'bg-slate-800/90 text-white border border-brand-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageSquare className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-brand-400" />
                <span className="text-xs font-medium truncate">{s.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(e, s.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded transition-all"
                title="Delete session"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-8">No chats yet. Ask a question to begin.</p>
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-surface-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-12">
              <div className="p-4 bg-gradient-to-tr from-brand-600/20 to-indigo-500/20 border border-brand-500/30 rounded-2xl text-brand-400 mb-4 shadow-xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Enterprise AI Knowledge Assistant
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-md leading-relaxed">
                Ask questions regarding company leave, production engineering, or incident policies.
                Answers are grounded strictly in uploaded documents with verified citations.
              </p>

              <div className="w-full mt-8 space-y-2 text-left">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Suggested Questions:
                </span>
                {exampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="w-full p-3 rounded-xl bg-surface-950/80 hover:bg-slate-800/70 border border-slate-800/80 hover:border-brand-500/40 text-xs text-slate-300 transition-all flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <span className="text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message List */
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-brand-500/20">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4.5 ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/10'
                      : 'bg-surface-950/90 border border-slate-800/90 text-slate-200'
                  }`}
                >
                  {/* Content with Markdown */}
                  <div className="text-sm leading-relaxed prose prose-invert max-w-none prose-p:my-1.5 prose-headings:text-white prose-strong:text-white prose-ul:my-1.5 prose-li:my-0.5">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  {/* Assistant Citations & Action Bar */}
                  {msg.role === 'assistant' && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                      {/* Citations Pill Bar */}
                      {msg.retrieved_sources && msg.retrieved_sources.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                            Grounded Evidence ({msg.retrieved_sources.length} Sources):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.retrieved_sources.map((c, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedCitation(c)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-medium rounded-lg transition-all"
                              >
                                <FileText className="w-3 h-3 text-brand-400" />
                                <span className="truncate max-w-[150px]">{c.document_name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  P.{c.page_number || 1}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Utility buttons (Copy, Thumbs) */}
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="inline-flex items-center gap-1 px-2 py-1 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            {copiedId === msg.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFeedback(msg.id, 1)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              msg.feedback?.rating === 1
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'hover:text-slate-200 hover:bg-slate-800'
                            }`}
                            title="Helpful answer"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, -1)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              msg.feedback?.rating === -1
                                ? 'text-rose-400 bg-rose-500/10'
                                : 'hover:text-slate-200 hover:bg-slate-800'
                            }`}
                            title="Not helpful / inaccurate"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing / Searching indicator */}
          {sending && (
            <div className="flex gap-3.5 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 bg-surface-950/80 border border-slate-800 rounded-2xl text-xs text-slate-300 flex items-center gap-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Retrieving evidence and verifying citations...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-surface-950 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask a question about annual leave, deployment runbooks, security protocols..."
              disabled={sending}
              className="flex-1 px-4 py-3 bg-surface-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || sending}
              className="p-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
            <span>Press Enter to send. Answers strictly reference authorized documents.</span>
            <span className="hidden sm:inline">RAG Hallucination Guard: ON</span>
          </div>
        </div>
      </div>
    </div>
  );
};
