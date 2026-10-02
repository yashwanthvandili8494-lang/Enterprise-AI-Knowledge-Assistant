import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Map route to title
  const getPageTitle = (path: string): string => {
    if (path === '/') return 'Operational Overview';
    if (path.startsWith('/chat')) return 'AI Knowledge Assistant';
    if (path === '/documents') return 'Enterprise Document Library';
    if (path === '/upload') return 'Secure Document Ingestion';
    if (path.startsWith('/documents/')) return 'Document Inspection';
    if (path === '/history') return 'Conversation Archives';
    if (path === '/users') return 'User & Role Directory';
    if (path === '/permissions') return 'Document Access Control';
    if (path === '/audit') return 'Security Audit Trail';
    if (path === '/settings') return 'System Configuration';
    return '';
  };

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 flex">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          title={getPageTitle(location.pathname)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
