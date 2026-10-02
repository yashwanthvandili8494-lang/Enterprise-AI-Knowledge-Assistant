import React, { useState, useEffect } from 'react';
import { Users, Shield, CheckCircle, XCircle, Edit2, ShieldAlert } from 'lucide-react';
import { userService } from '../services/userService';
import { User, UserRole } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>('EMPLOYEE');
  const [saving, setSaving] = useState(false);
  const { user: currentUser, hasRole } = useAuth();
  const { toast } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.list();
      setUsers(data);
    } catch {
      toast('Failed to load user directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenRoleModal = (u: User) => {
    setSelectedUser(u);
    setNewRole(u.role);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await userService.updateRole(selectedUser.id, newRole);
      toast(`Updated role for ${selectedUser.name} to ${newRole}`, 'success');
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Failed to update user role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u: User) => {
    if (u.id === currentUser?.id) {
      toast('You cannot deactivate your own account', 'error');
      return;
    }
    const nextState = !u.is_active;
    try {
      await userService.update(u.id, { is_active: nextState });
      toast(`${u.name} is now ${nextState ? 'active' : 'inactive'}`, 'info');
      loadUsers();
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Failed to update user status', 'error');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="rose">Admin</Badge>;
      case 'KNOWLEDGE_MANAGER':
        return <Badge variant="violet">Knowledge Manager</Badge>;
      default:
        return <Badge variant="emerald">Employee</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Role Change Modal */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Modify Role & Permissions"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Updating access permissions for <span className="font-semibold text-white">{selectedUser?.name}</span> ({selectedUser?.email})
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Assigned Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="EMPLOYEE">Employee (Search, Chat, View permitted documents)</option>
              <option value="KNOWLEDGE_MANAGER">Knowledge Manager (Upload, Vectorize, Set permissions)</option>
              <option value="ADMIN">Admin (Full system control, Manage roles, View audit logs)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSaveRole}>
              Save Role Change
            </Button>
          </div>
        </div>
      </Modal>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Organization Directory</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage workspace members, role-based privileges, and active statuses.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading team members...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Member Since</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">{getRoleBadge(u.role)}</td>

                    <td className="px-5 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active Member'}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {hasRole('ADMIN') && (
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRoleModal(u)}
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                          >
                            Edit Role
                          </Button>
                          {u.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(u)}
                              className={u.is_active ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400'}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
