/**
 * ============================================
 * API Hooks - React hooks for data fetching
 * ============================================
 * 
 * Provides loading, error, and empty states.
 * All hooks use the centralized API client.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MDAPI,
  CEOAPI,
  FDAPI,
  FOAPI,
  AdminAPI,
  AuthAPI,
  StrategicOverview,
  PerformersResponse,
  ContributionResponse,
  RiskRadarResponse,
  ClusterDrilldownResponse,
  PBTTrendResponse,
  PerformanceHierarchyResponse,
  Report,
  PendingReport,
  Company,
  Cluster,
  User,
  ApiResponse,
} from '@/lib/api-client';

// ─────────────────────────────────────────────────────────────
// Base Hook
// ─────────────────────────────────────────────────────────────

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  refetch: () => Promise<void>;
}

function useApiCall<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  dependencies: any[] = [],
  emptyCheck?: (data: T) => boolean
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetcher();
      
      if (response.error) {
        setError(response.error);
        setData(null);
      } else {
        setData(response.data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isEmpty = data !== null && (emptyCheck ? emptyCheck(data) : false);

  return { data, loading, error, isEmpty, refetch: fetchData };
}

// ─────────────────────────────────────────────────────────────
// MD Dashboard Hooks
// ─────────────────────────────────────────────────────────────

export function useStrategicOverview(
  mode: 'month' | 'ytd',
  year?: number,
  month?: number
): UseApiState<StrategicOverview> {
  return useApiCall(
    () => MDAPI.getStrategicOverview(mode, year, month),
    [mode, year, month],
    (data) => data.companies_reporting === 0
  );
}

export function usePerformers(
  mode: 'month' | 'ytd',
  year?: number,
  month?: number,
  topN: number = 5
): UseApiState<PerformersResponse> {
  return useApiCall(
    () => MDAPI.getPerformers(mode, year, month, topN),
    [mode, year, month, topN],
    (data) => data.top_performers.length === 0 && data.bottom_performers.length === 0
  );
}

export function useClusterContribution(
  mode: 'month' | 'ytd',
  year?: number,
  month?: number
): UseApiState<ContributionResponse> {
  return useApiCall(
    () => MDAPI.getClusterContribution(mode, year, month),
    [mode, year, month],
    (data) => data.clusters.length === 0
  );
}

export function useRiskRadar(
  mode: 'month' | 'ytd',
  year?: number,
  month?: number
): UseApiState<RiskRadarResponse> {
  return useApiCall(
    () => MDAPI.getRiskRadar(mode, year, month),
    [mode, year, month],
    (data) => data.clusters.length === 0
  );
}

export function useClusterDrilldown(
  clusterId: string | null,
  mode: 'month' | 'ytd',
  year?: number,
  month?: number
): UseApiState<ClusterDrilldownResponse> {
  return useApiCall(
    () => clusterId 
      ? MDAPI.getClusterDrilldown(clusterId, mode, year, month)
      : Promise.resolve({ data: null, error: 'No cluster selected', status: 400 }),
    [clusterId, mode, year, month],
    (data) => data.companies.length === 0
  );
}

export function usePBTTrend(params?: {
  company_id?: string;
  cluster_id?: string;
  start_year?: number;
  end_year?: number;
}): UseApiState<PBTTrendResponse> {
  return useApiCall(
    () => MDAPI.getPBTTrend(params),
    [params?.company_id, params?.cluster_id, params?.start_year, params?.end_year],
    (data) => data.data.length === 0
  );
}

export function usePerformanceHierarchy(
  year?: number,
  month?: number
): UseApiState<PerformanceHierarchyResponse> {
  return useApiCall(
    () => MDAPI.getPerformanceHierarchy(year, month),
    [year, month],
    (data) => data.clusters.length === 0
  );
}

// ─────────────────────────────────────────────────────────────
// FD Dashboard Hooks
// ─────────────────────────────────────────────────────────────

export function usePendingReports(): UseApiState<{ reports: PendingReport[]; total: number }> {
  return useApiCall(
    () => FDAPI.getPendingReports(),
    [],
    (data) => data.reports.length === 0
  );
}

export function useFDDashboard(): UseApiState<{
  pending_review: number;
  approved_this_month: number;
  rejected_this_month: number;
  total_companies: number;
  companies_submitted: number;
  companies_pending: number;
}> {
  return useApiCall(
    () => FDAPI.getDashboard(),
    []
  );
}

// ─────────────────────────────────────────────────────────────
// FO Dashboard Hooks
// ─────────────────────────────────────────────────────────────

export function useMyCompanies(): UseApiState<Company[]> {
  return useApiCall(
    () => FOAPI.getMyCompanies(),
    [],
    (data) => data.length === 0
  );
}

export function useMyReports(status?: string, year?: number): UseApiState<{ reports: Report[]; total: number }> {
  return useApiCall(
    () => FOAPI.getMyReports(status, year),
    [status, year],
    (data) => data.reports.length === 0
  );
}

// ─────────────────────────────────────────────────────────────
// Admin Hooks
// ─────────────────────────────────────────────────────────────

export function useClusters(): UseApiState<Cluster[]> {
  return useApiCall(
    () => AdminAPI.getClusters(),
    [],
    (data) => data.length === 0
  );
}

export function useCompanies(clusterId?: string): UseApiState<Company[]> {
  return useApiCall(
    () => AdminAPI.getCompanies(clusterId),
    [clusterId],
    (data) => data.length === 0
  );
}

// ─────────────────────────────────────────────────────────────
// Common UI Components
// ─────────────────────────────────────────────────────────────

export interface LoadingStateProps {
  message?: string;
}

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}
