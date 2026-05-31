import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { auth } from '../lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on page load
  useEffect(() => {
    const token = localStorage.getItem('ca_token');
    const saved  = localStorage.getItem('ca_user');
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('ca_token');
        localStorage.removeItem('ca_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await auth.login({ email, password });
      localStorage.setItem('ca_token', res.access_token);
      const u: User = {
        id:     res.user.id,
        name:   res.user.name,
        email:  res.user.email,
        role:   res.user.role,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.email}`,
      };
      localStorage.setItem('ca_user', JSON.stringify(u));
      setUser(u);
    } catch (e: any) {
      setError(e.message ?? 'Giriş başarısız');
      throw e;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    setError(null);
    try {
      const res = await auth.register({ name, email, password, role });
      localStorage.setItem('ca_token', res.access_token);
      const u: User = {
        id:     res.user.id,
        name:   res.user.name,
        email:  res.user.email,
        role:   res.user.role,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      };
      localStorage.setItem('ca_user', JSON.stringify(u));
      setUser(u);
    } catch (e: any) {
      setError(e.message ?? 'Kayıt başarısız');
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('ca_token');
    localStorage.removeItem('ca_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
