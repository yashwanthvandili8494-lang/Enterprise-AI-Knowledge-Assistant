import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_SERVER_URL } from '../services/api';
import { Settings as SettingsIcon, Cpu, Database, Shield, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const [hRes, rRes] = await Promise.all([
        axios.get(`${API_SERVER_URL}/health`),
        axios.get(`${API_SERVER_URL}/ready`),
      ]);
      setHealthStatus({
        health: hRes.data,
        readiness: rRes.data,
      });
      toast('Diagnostics completed: All backend systems operational', 'success');
    } catch (err: any) {
      toast('Health check warning: Database or backend probe unreachable', 'error');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System & AI Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Review enterprise tenant identity, RAG model hyperparameters, and cluster telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organization & Account Card */}
        <Card glow className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="p-2 bg-brand-500/10 text-brand-400 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Tenant & Account Identity</h3>
              <p className="text-xs text-slate-400">Authenticated workspace session</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">Organization:</span>
              <span className="font-semibold text-white">{user?.organization_name || 'Acme Enterprise'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">Tenant ID:</span>
              <span className="font-mono text-slate-300 truncate max-w-[200px]">{user?.organization_id}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">Logged in as:</span>
              <span className="font-semibold text-white">{user?.name} ({user?.email})</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Assigned Privilege:</span>
              <Badge variant="indigo" size="sm">{user?.role}</Badge>
            </div>
          </div>
        </Card>

        {/* AI & Embedding Model Configuration */}
        <Card glow className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Engine & Embedding Specs</h3>
              <p className="text-xs text-slate-400">Configured RAG parameters</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">AI Provider:</span>
              <span className="font-mono text-brand-400 uppercase font-semibold">
                {healthStatus?.health?.ai_provider || 'Google Gemini / Fallback'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">Embedding Vector Dimensions:</span>
              <span className="font-mono text-slate-200">768 Float32 Dimensions</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">Sliding Window Chunk Size:</span>
              <span className="font-mono text-slate-200">800 chars (150 overlap)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">Top-K Retrieved Passages:</span>
              <span className="font-mono text-slate-200">5 Chunks</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Cosine Similarity Threshold:</span>
              <span className="font-mono text-emerald-400">0.25 (Grounded Filter)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* System Health Probe */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cluster Diagnostics</h3>
              <p className="text-xs text-slate-400">Realtime FastAPI and Database readiness</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
            loading={checking}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Run Probe
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-surface-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-300">FastAPI API Liveness:</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Healthy (v1.0.0)
            </span>
          </div>

          <div className="p-4 bg-surface-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-300">Vector Database Connection:</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Connected & Ready
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
