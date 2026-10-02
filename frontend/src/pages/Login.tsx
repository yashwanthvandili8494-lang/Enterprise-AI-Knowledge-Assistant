import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Mail, ArrowRight, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast('Please enter both email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast('Welcome back!', 'success');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please verify credentials.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('DemoPass123!');
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-2xl shadow-xl shadow-brand-500/25 text-white">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
          Enterprise AI Knowledge Assistant
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Secure, Grounded Intelligence for Authorized Teams
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-surface-900/80 border border-slate-800/80 py-8 px-6 shadow-2xl rounded-3xl backdrop-blur-xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="block w-full pl-10 pr-4 py-2.5 bg-surface-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="block w-full pl-10 pr-4 py-2.5 bg-surface-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <Button type="submit" loading={loading} className="w-full py-3" icon={<ArrowRight className="w-4 h-4" />}>
                Sign In to Workspace
              </Button>
            </div>
          </form>

          {/* Quick Demo Logins for Portfolio reviewers */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
              Quick Demo Accounts (One-Click)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@acme.com')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-rose-500/30 rounded-xl text-[11px] font-medium text-rose-300 transition-all text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemo('manager@acme.com')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-violet-500/30 rounded-xl text-[11px] font-medium text-violet-300 transition-all text-center"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => fillDemo('employee@acme.com')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 rounded-xl text-[11px] font-medium text-emerald-300 transition-all text-center"
              >
                Employee
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Need a new enterprise account?{' '}
              <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
                Register Organization
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
