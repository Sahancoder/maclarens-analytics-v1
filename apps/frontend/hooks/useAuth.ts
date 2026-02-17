'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useQuery } from '@apollo/client';
import { GET_CURRENT_USER } from '@/graphql/queries';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
  clusterId?: string;
  isActive?: boolean;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const isSessionLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  // Fetch user profile from GraphQL backend when authenticated
  const { data, loading: gqlLoading, error, refetch } = useQuery(GET_CURRENT_USER, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const user: UserProfile | null = data?.me ?? null;
  const loading = isSessionLoading || (isAuthenticated && gqlLoading);

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    
    // Admin has access to everything (superuser)
    const isAdmin = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'system_admin';
    if (isAdmin) return true;

    const roles = Array.isArray(role) ? role : [role];
    return roles.some(r => 
      user.role?.toLowerCase() === r.toLowerCase() ||
      user.role?.toLowerCase().replace('_', '') === r.toLowerCase().replace('_', '')
    );
  };

  const hasPermission = (_permission: string): boolean => {
    // Implement permission checking logic if needed
    return true;
  };

  const loginWithMicrosoft = async (callbackUrl?: string) => {
    await signIn('azure-ad', { 
      callbackUrl: callbackUrl || '/auth/callback' 
    });
  };

  const logout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return {
    user,
    loading,
    error,
    isAuthenticated,
    hasRole,
    hasPermission,
    refetch,
    session,
    accessToken: session?.accessToken,
    loginWithMicrosoft,
    logout,
  };
}
