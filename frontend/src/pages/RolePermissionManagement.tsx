import React from 'react';
import { ShieldCheck, Lock, Check, X, Users, FileText, Database } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const RolePermissionManagement: React.FC = () => {
  const permissionsMatrix = [
    { capability: 'Search & Chat with Knowledge Base', employee: true, manager: true, admin: true },
    { capability: 'View Citations & Source Excerpts', employee: true, manager: true, admin: true },
    { capability: 'Submit Helpful / Not Helpful Feedback', employee: true, manager: true, admin: true },
    { capability: 'Upload New Documents', employee: false, manager: true, admin: true },
    { capability: 'Manage Document Metadata & Tags', employee: false, manager: true, admin: true },
    { capability: 'Assign Document Access Permissions', employee: false, manager: true, admin: true },
    { capability: 'Retry Failed Document Indexing', employee: false, manager: true, admin: true },
    { capability: 'Delete Documents & Vector Chunks', employee: false, manager: true, admin: true },
    { capability: 'Manage Team Member Roles', employee: false, manager: false, admin: true },
    { capability: 'View Security Audit Logs', employee: false, manager: true, admin: true },
    { capability: 'Manage Organization Settings', employee: false, manager: false, admin: true },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Role & Access Control Matrix</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Backend-enforced Role-Based Access Control (RBAC) and document isolation boundaries.
        </p>
      </div>

      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card glow className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="rose">ADMIN</Badge>
            <ShieldCheck className="w-5 h-5 text-rose-400" />
          </div>
          <h3 className="text-base font-bold text-white">Full Workspace Administrator</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ultimate administrative control. Oversees tenant configurations, assigns team roles, reviews security audit trails, and manages all organizational knowledge.
          </p>
        </Card>

        <Card glow className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="violet">KNOWLEDGE_MANAGER</Badge>
            <Database className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="text-base font-bold text-white">Knowledge Base Curator</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Responsible for document hygiene. Uploads policies, triggers vector indexing, manages document categories, sets role access rules, and retries processing failures.
          </p>
        </Card>

        <Card glow className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="emerald">EMPLOYEE</Badge>
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-base font-bold text-white">Authorized Consumer</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Queries the assistant for grounded policy answers, views authentic source citations, submits answer feedback, and manages personal chat session archives.
          </p>
        </Card>
      </div>

      {/* Matrix Table */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <h3 className="text-sm font-bold text-white">Security Capability Matrix</h3>
          <p className="text-xs text-slate-400">Strictly verified on FastAPI backend dependencies before query execution.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Capability / Operation</th>
                <th className="px-6 py-3.5 text-center">Employee</th>
                <th className="px-6 py-3.5 text-center">Knowledge Manager</th>
                <th className="px-6 py-3.5 text-center">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {permissionsMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-3.5 text-xs sm:text-sm font-medium text-slate-200">
                    {row.capability}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {row.employee ? (
                      <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {row.manager ? (
                      <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {row.admin ? (
                      <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
