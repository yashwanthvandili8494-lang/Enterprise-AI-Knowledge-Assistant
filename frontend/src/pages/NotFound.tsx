import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl text-brand-400 mb-5 shadow-2xl">
        <HelpCircle className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-white tracking-tight">404 - Resource Not Found</h1>
      <p className="text-sm text-slate-400 mt-2 max-w-md">
        The page or enterprise document you requested does not exist or may have been archived.
      </p>
      <Link to="/" className="mt-6">
        <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
};
