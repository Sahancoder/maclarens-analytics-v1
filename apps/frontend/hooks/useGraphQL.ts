'use client';

import { useState, useEffect, useCallback } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';

interface UseGraphQLOptions<T> {
  query: string;
  variables?: Record<string, unknown>;
  token?: string;
  skip?: boolean;
}

interface UseGraphQLResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGraphQL<T>({
  query,
  variables,
  token,
  skip = false,
}: UseGraphQLOptions<T>): UseGraphQLResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (skip) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await graphqlRequest<T>(query, variables, token);
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query, variables, token, skip]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useMutation<T, V = Record<string, unknown>>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (
    mutation: string,
    variables: V,
    token?: string
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await graphqlRequest<T>(mutation, variables as Record<string, unknown>, token);
      return result;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
