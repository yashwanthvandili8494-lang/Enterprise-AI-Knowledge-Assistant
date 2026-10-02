import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  UploadCloud,
  History,
  Users,
  ShieldCheck,
  FileClock,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'AI Assistant', icon: MessageSquare, path: '/chat', highlight: true },
    { label: 'Documents', icon: FileText, path: '/documents' },
    { label: 'Upload Document', icon: UploadCloud, path: '/upload' },
    { label: 'Chat History', icon: History, path: '/history' },
  ];

  const adminItems = [
    { label: 'User Directory', icon: Users, path: '/users', roles: ['ADMIN', 'KNOWLEDGE_MANAGER'] },
    { label: 'Permissions', icon: ShieldCheck, path: '/permissions', roles: ['ADMIN', 'KNOWLEDGE_MANAGER'] },
    { label: 'Audit Trail', icon: FileClock, path: '/audit', roles: ['ADMIN', 'KNOWLEDGE_MANAGER'] },
  ];

  const roleColor = {
    ADMIN: 'rose',
    KNOWLEDGE_MANAGER: 'violet',
    EMPLOYEE: 'emerald',
  }[user?.role || 'EMPLOYEE'] as 'rose' | 'violet' | 'emerald';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-surface-950/95 border-r border-slate-800/80 backdrop-blur-2xl flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-xl shadow-lg shadow-brand-500/25 text-white">
              <Sparkles className="w-5 h-5 animate-pulse-subtle" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-none">
                Enterprise AI
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {user?.organization_name || 'Acme Enterprise'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Core Platform
            </span>
            <nav className="mt-2 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500/20 text-brand-300 rounded-md">
                      RAG
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Admin & Management Section */}
          {(hasRole('ADMIN') || hasRole('KNOWLEDGE_MANAGER')) && (
            <div>
              <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Administration
              </span>
              <nav className="mt-2 space-y-1">
                {adminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          )}

          <div>
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Preferences
            </span>
            <nav className="mt-2 space-y-1">
              <NavLink
                to="/settings"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                  }`
                }
              >
                <SettingsIcon className="w-4 h-4 shrink-0" />
                <span>Settings</span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-surface-900/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
                {user?.name?.slice(0, 2) || 'US'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <Badge variant={roleColor} size="sm">
              {user?.role === 'KNOWLEDGE_MANAGER' ? 'KM' : user?.role}
            </Badge>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};
