import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  register: (name: string, email: string, role: UserRole) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const saved = localStorage.getItem('comp_auth');
    if (saved) {
      setUser(JSON.parse(saved));
    }
    setIsLoading(false);
  }, []);

  const login = (role: UserRole) => {
    const mockUser: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      name: role === 'ADMIN' ? 'Mevzuat Yöneticisi' : 'Akademik Birim Üyesi',
      email: role === 'ADMIN' ? 'admin@universite.edu.tr' : 'kullanici@universite.edu.tr',
      role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}_${Date.now()}`
    };
    setUser(mockUser);
    localStorage.setItem('comp_auth', JSON.stringify(mockUser));
  };

  const register = (name: string, email: string, role: UserRole) => {
    const mockUser: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      name,
      email,
      role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    };
    setUser(mockUser);
    localStorage.setItem('comp_auth', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('comp_auth');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
