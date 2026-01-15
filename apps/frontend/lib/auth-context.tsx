'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { graphqlRequest, LOGIN_MUTATION, ME_QUERY } from './graphql-client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
  clusterId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  getRedirectPath: (user: User) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('mclarens_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const data = await graphqlRequest<{ me: User }>(ME_QUERY, {}, authToken);
      if (data.me) {
        setUser(data.me);
        localStorage.setItem('mclarens_user', JSON.stringify(data.me));
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('mclarens_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await graphqlRequest<{
        login: { token: string; user: User } | null;
      }>(LOGIN_MUTATION, { input: { email, password } });

      if (data.login) {
        setToken(data.login.token);
        setUser(data.login.user);
        localStorage.setItem('mclarens_token', data.login.token);
        localStorage.setItem('mclarens_user', JSON.stringify(data.login.user));
        return { success: true, user: data.login.user };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const getRedirectPath = (user: User): string => {
    switch (user.role) {
      case 'DATA_OFFICER':
      case 'FINANCE_OFFICER':
        return '/finance-officer/dashboard';
      case 'COMPANY_DIRECTOR':
      case 'FINANCE_DIRECTOR':
        return '/finance-director/dashboard';
      case 'ADMIN':
      case 'SYSTEM_ADMIN':
        return '/system-admin/dashboard';
      case 'CEO':
      case 'MD':
        return '/md/dashboard';
      default:
        return '/';
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mclarens_token');
    localStorage.removeItem('mclarens_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, getRedirectPath }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
