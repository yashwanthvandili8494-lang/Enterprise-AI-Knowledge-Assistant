import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; organization_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    if (!authService.isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const current = await authService.getMe();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setUser(res.user);
  };

  const register = async (data: { name: string; email: string; password: string; organization_name?: string }) => {
    const res = await authService.register(data);
    setUser(res.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
