import React from 'react';
import { Menu, Shield, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, title }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 h-16 bg-surface-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">{title}</h2>}
      </div>

      <div className="flex items-center gap-3">
        {/* RAG Engine Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs text-slate-300">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="font-medium">RAG Guard: Active</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        {/* User Role Tag */}
        <div className="flex items-center gap-2">
          <Badge variant="indigo" size="sm">
            <Shield className="w-3 h-3 mr-1" />
            {user?.role}
          </Badge>
        </div>
      </div>
    </header>
  );
};
