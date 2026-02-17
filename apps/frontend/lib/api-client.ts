/**
 * ============================================
 * McLarens Analytics - API Client
 * ============================================
 * 
 * Centralized API client with typed responses.
 * All pages should use this client for data fetching.
 * 
 * Uses Next.js rewrites to proxy /api/* to backend.
 */

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Configuration
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

const API_BASE = '/api';

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Common Types
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Auth Types
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'ceo' | 'company_director' | 'data_officer';
  company_id?: string;
  cluster_id?: string;
  is_active: boolean;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Financial Types
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export interface FinancialMetric {
  name: string;
  actual: number;
  budget: number | null;
  variance: number | null;
  variance_pct: number | null;
  achievement_pct: number | null;
  is_favorable: boolean;
  formatted_actual: string;
  formatted_budget: string | null;
}

export interface FinancialData {
  id: string;
  company_id: string;
  year: number;
  month: number;
  scenario: 'ACTUAL' | 'BUDGET';
  exchange_rate: number;
  revenue_lkr: number;
  revenue_usd: number;
  gp: number;
  gp_margin: number;
  other_income: number;
  personal_exp: number;
  admin_exp: number;
  selling_exp: number;
  finance_exp: number;
  depreciation: number;
  total_overheads: number;
  provisions: number;
  exchange_gl: number;
  pbt_before: number;
  np_margin: number;
  non_ops_exp: number;
  non_ops_income: number;
  pbt_after: number;
  ebit: number;
  ebitda: number;
}

export interface BudgetComparison {
  actual: FinancialData | null;
  budget: FinancialData | null;
  variance: Record<string, {
    actual: number;
    budget: number;
    difference: number;
    percentage: number;
    favorable: boolean;
  }> | null;
  achievement_pct: number | null;
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Company & Cluster Types
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export interface Company {
  id: string;
  name: string;
  code: string;
  cluster_id: string;
  fy_start_month: number;
  currency: string;
  is_active: boolean;
}

export interface Cluster {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  company_count?: number;
}

export interface AdminDashboardStats {
  total_users: number;
  active_companies: number;
  total_clusters: number;
  pending_reports: number;
  new_users_this_month: number;
}

export interface AdminActivity {
  id: string;
  timestamp: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
}

export interface AdminActivityList {
  activities: AdminActivity[];
  total: number;
}

export interface AdminRole {
  role_id: number;
  role_name: string;
}

export interface AdminCluster {
  cluster_id: string;
  cluster_name: string;
  is_active: boolean;
  total_companies: number;
  active_companies: number;
  inactive_companies: number;
  created_date?: string | null;
}

export interface AdminClusterList {
  clusters: AdminCluster[];
  total_clusters: number;
  total_companies: number;
  active_companies: number;
  inactive_companies: number;
}

export interface AdminCompany {
  company_id: string;
  company_name: string;
  cluster_id: string;
  cluster_name: string | null;
  fin_year_start_month: number | null;
  is_active: boolean;
  user_count: number;
  created_date?: string | null;
  modified_date?: string | null;
}

export interface AdminCompanyList {
  companies: AdminCompany[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminUserRoleAssignment {
  company_id: string;
  company_name: string | null;
  cluster_id: string | null;
  cluster_name: string | null;
  role_id: number;
  role_name: string | null;
  is_active: boolean;
}

export interface AdminUser {
  user_id: string;
  user_email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_date?: string | null;
  modified_date?: string | null;
  roles: AdminUserRoleAssignment[];
}

export interface AdminUserList {
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminAssignment {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  company_id: string;
  company_name: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
}

export interface AdminAssignmentList {
  assignments: AdminAssignment[];
  total: number;
}


// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Admin Dashboard Types
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export interface SystemHealth {
  overall_status: 'operational' | 'degraded' | 'down';
  services: {
    database: { status: string; response_time_ms?: number; error?: string };
    redis: { status: string; response_time_ms?: number };
    email_service: { status: string; provider?: string };
    api: { status: string; version?: string };
  };
  timestamp: string;
}

export interface DashboardStats {
  total_users: number;
  active_companies: number;
  total_clusters: number;
  pending_reports: number;
  system_health: SystemHealth;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user_email: string;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
}

export interface ActivityResponse {
  activities: ActivityLog[];
  total: number;
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Report Types
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏


export interface Report {
  id: string;
  company_id: string;
  company_name: string;
  company_code: string;
  year: number;
  month: number;
  month_name: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  fo_comment?: string;
  rejection_reason?: string;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReportDetail extends Report {
  actual: FinancialData | null;
  budget: FinancialData | null;
  comments: ReportComment[];
}

export interface ReportComment {
  id: string;
  user_name: string;
  content: string;
  is_system: boolean;
  created_at: string;
}

export interface PendingReport extends Report {
  cluster_name?: string;
  submitted_by_name: string;
  submitted_by_email: string;
  days_pending: number;
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Dashboard Types
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export interface StrategicOverview {
  mode: 'month' | 'ytd';
  period: string;
  year: number;
  month: number | null;
  fy_start_month: number;
  revenue: FinancialMetric;
  gp: FinancialMetric;
  gp_margin: FinancialMetric;
  total_overhead: FinancialMetric;
  pbt: FinancialMetric;
  pbt_achievement: FinancialMetric;
  avg_exchange_rate: number;
  companies_total: number;
  companies_reporting: number;
  companies_approved: number;
}

export interface PerformerEntry {
  rank: number;
  company_id: string;
  company_name: string;
  company_code: string;
  cluster_name: string;
  pbt_actual: number;
  pbt_budget: number;
  achievement_pct: number;
  variance: number;
  formatted_pbt: string;
}

export interface PerformersResponse {
  mode: string;
  period: string;
  top_performers: PerformerEntry[];
  bottom_performers: PerformerEntry[];
}

export interface ClusterContribution {
  cluster_id: string;
  cluster_name: string;
  cluster_code: string;
  company_count: number;
  companies_reporting: number;
  revenue: number;
  gp: number;
  pbt: number;
  revenue_contribution_pct: number;
  gp_contribution_pct: number;
  pbt_contribution_pct: number;
  pbt_budget: number;
  pbt_achievement_pct: number;
}

export interface ContributionResponse {
  mode: string;
  period: string;
  total_revenue: number;
  total_gp: number;
  total_pbt: number;
  clusters: ClusterContribution[];
}

export interface ClusterRisk {
  cluster_id: string;
  cluster_name: string;
  cluster_code: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: string[];
  revenue_variance_pct: number;
  gp_margin_variance: number;
  pbt_variance_pct: number;
  companies_below_target: number;
  companies_total: number;
}

export interface RiskRadarResponse {
  mode: string;
  period: string;
  overall_risk: 'low' | 'medium' | 'high' | 'critical';
  clusters: ClusterRisk[];
  risk_thresholds: Record<string, number>;
}

export interface CompanyDrilldown {
  id: string;
  name: string;
  code: string;
  revenue_actual: number;
  revenue_budget: number;
  gp_actual: number;
  gp_budget: number;
  gp_margin_actual: number;
  gp_margin_budget: number;
  pbt_actual: number;
  pbt_budget: number;
  revenue_variance_pct: number;
  pbt_variance_pct: number;
  pbt_achievement_pct: number;
  report_status: string | null;
  is_approved: boolean;
}

export interface ClusterDrilldownResponse {
  mode: string;
  period: string;
  cluster_id: string;
  cluster_name: string;
  cluster_code: string;
  total_revenue: number;
  total_gp: number;
  total_pbt: number;
  avg_gp_margin: number;
  pbt_achievement_pct: number;
  companies: CompanyDrilldown[];
}

export interface TrendDataPoint {
  year: number;
  month: number;
  period_label: string;
  pbt_actual: number;
  pbt_budget: number | null;
  achievement_pct: number | null;
}

export interface PBTTrendResponse {
  company_id: string | null;
  company_name: string | null;
  cluster_id: string | null;
  cluster_name: string | null;
  start_year: number;
  end_year: number;
  data: TrendDataPoint[];
}

export interface HierarchyCompany {
  id: string;
  name: string;
  code: string;
  pbt_actual: number;
  pbt_budget: number;
  achievement_pct: number;
  gp_margin: number;
  report_status: string | null;
}

export interface HierarchyCluster {
  id: string;
  name: string;
  code: string;
  pbt_actual: number;
  pbt_budget: number;
  achievement_pct: number;
  company_count: number;
  companies: HierarchyCompany[];
}

export interface PerformanceHierarchyResponse {
  mode: string;
  period: string;
  year: number;
  month: number;
  group_pbt_actual: number;
  group_pbt_budget: number;
  group_achievement_pct: number;
  clusters: HierarchyCluster[];
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Base Fetch Wrapper
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mclarens_token');
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        data: null,
        error: errorBody || `Error ${response.status}: ${response.statusText}`,
        status: response.status,
      };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Auth API
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export const AuthAPI = {
  async login(email: string, password?: string): Promise<ApiResponse<LoginResponse>> {
    return apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async devLogin(email: string): Promise<ApiResponse<LoginResponse>> {
    return apiFetch<LoginResponse>('/auth/login/dev', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async me(): Promise<ApiResponse<User>> {
    return apiFetch<User>('/auth/me');
  },

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return apiFetch('/auth/logout', { method: 'POST' });
  },
};

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Admin API
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export const AdminAPI = {
  async getDashboardStats(): Promise<ApiResponse<AdminDashboardStats>> {
    return apiFetch<AdminDashboardStats>('/admin/dashboard');
  },

  async getRecentActivity(limit: number = 10): Promise<ApiResponse<AdminActivityList>> {
    return apiFetch<AdminActivityList>(`/admin/activity?limit=${limit}`);
  },

  async getRoles(): Promise<ApiResponse<AdminRole[]>> {
    return apiFetch<AdminRole[]>('/admin/roles');
  },

  async getClustersList(): Promise<ApiResponse<AdminClusterList>> {
    return apiFetch<AdminClusterList>('/admin/clusters');
  },

  async getClusters(): Promise<ApiResponse<Cluster[]>> {
    const response = await apiFetch<AdminClusterList>('/admin/clusters');
    if (response.error || !response.data) {
      return { data: null, error: response.error, status: response.status };
    }
    return {
      data: response.data.clusters.map((c) => ({
        id: c.cluster_id,
        name: c.cluster_name,
        code: c.cluster_id,
        is_active: c.is_active,
        company_count: c.total_companies,
      })),
      error: null,
      status: response.status,
    };
  },

  async createCluster(data: { cluster_name: string; is_active?: boolean }): Promise<ApiResponse<AdminCluster>> {
    return apiFetch<AdminCluster>('/admin/clusters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCluster(id: string, data: { cluster_name?: string; is_active?: boolean }): Promise<ApiResponse<AdminCluster>> {
    return apiFetch<AdminCluster>(`/admin/clusters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteCluster(id: string): Promise<ApiResponse<null>> {
    return apiFetch<null>(`/admin/clusters/${id}`, { method: 'DELETE' });
  },

  async getClusterCompanies(clusterId: string): Promise<ApiResponse<AdminCompany[]>> {
    return apiFetch<AdminCompany[]>(`/admin/clusters/${clusterId}/companies`);
  },

  async getCompaniesList(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    cluster_id?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<AdminCompanyList>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.search) query.set('search', params.search);
    if (params?.cluster_id) query.set('cluster_id', params.cluster_id);
    if (typeof params?.is_active === 'boolean') query.set('is_active', String(params.is_active));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<AdminCompanyList>(`/admin/companies${suffix}`);
  },

  async getCompanies(clusterId?: string): Promise<ApiResponse<Company[]>> {
    const query = clusterId ? `?cluster_id=${clusterId}` : '';
    const response = await apiFetch<AdminCompanyList>(`/admin/companies${query}`);
    if (response.error || !response.data) {
      return { data: null, error: response.error, status: response.status };
    }
    return {
      data: response.data.companies.map((c) => ({
        id: c.company_id,
        name: c.company_name,
        code: c.company_id,
        cluster_id: c.cluster_id,
        fy_start_month: c.fin_year_start_month ?? 1,
        currency: 'LKR',
        is_active: c.is_active,
      })),
      error: null,
      status: response.status,
    };
  },

  async createCompany(data: {
    company_name: string;
    cluster_id: string;
    fin_year_start_month?: number | null;
    is_active?: boolean;
  }): Promise<ApiResponse<AdminCompany>> {
    return apiFetch<AdminCompany>('/admin/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCompany(id: string, data: {
    company_name?: string;
    cluster_id?: string;
    fin_year_start_month?: number | null;
    is_active?: boolean;
  }): Promise<ApiResponse<AdminCompany>> {
    return apiFetch<AdminCompany>(`/admin/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteCompany(id: string): Promise<ApiResponse<null>> {
    return apiFetch<null>(`/admin/companies/${id}`, { method: 'DELETE' });
  },

  async getCompany(companyId: string): Promise<ApiResponse<AdminCompany>> {
    return apiFetch<AdminCompany>(`/admin/companies/${companyId}`);
  },

  async getUsers(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    role_id?: number;
    company_id?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<AdminUserList>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.search) query.set('search', params.search);
    if (params?.role_id) query.set('role_id', String(params.role_id));
    if (params?.company_id) query.set('company_id', params.company_id);
    if (typeof params?.is_active === 'boolean') query.set('is_active', String(params.is_active));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<AdminUserList>(`/admin/users${suffix}`);
  },

  async createUser(data: {
    user_email: string;
    first_name: string;
    last_name: string;
    role_id: number;
    company_id: string;
    is_active?: boolean;
  }): Promise<ApiResponse<AdminUser>> {
    return apiFetch<AdminUser>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(userId: string, data: {
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<AdminUser>> {
    return apiFetch<AdminUser>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<AdminUser>> {
    return apiFetch<AdminUser>(`/admin/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  async deleteUser(userId: string): Promise<ApiResponse<null>> {
    return apiFetch<null>(`/admin/users/${userId}`, { method: 'DELETE' });
  },

  async getAssignments(params?: {
    company_id?: string;
    user_id?: string;
    include_inactive?: boolean;
  }): Promise<ApiResponse<AdminAssignmentList>> {
    const query = new URLSearchParams();
    if (params?.company_id) query.set('company_id', params.company_id);
    if (params?.user_id) query.set('user_id', params.user_id);
    if (typeof params?.include_inactive === 'boolean') query.set('include_inactive', String(params.include_inactive));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<AdminAssignmentList>(`/admin/assignments${suffix}`);
  },

  async createAssignment(data: {
    user_id: string;
    company_id: string;
    role_id: number;
    is_active?: boolean;
  }): Promise<ApiResponse<AdminAssignment>> {
    return apiFetch<AdminAssignment>('/admin/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteAssignment(userId: string, companyId: string, roleId: number): Promise<ApiResponse<null>> {
    return apiFetch<null>(`/admin/assignments/${userId}/${companyId}/${roleId}`, { method: 'DELETE' });
  },

  async getCompanyUsers(companyId: string, includeInactive: boolean = false): Promise<ApiResponse<AdminAssignment[]>> {
    const query = includeInactive ? '?include_inactive=true' : '';
    return apiFetch<AdminAssignment[]>(`/admin/companies/${companyId}/users${query}`);
  },

  async assignUser(companyId: string, userEmail: string, roleId: number): Promise<ApiResponse<AdminAssignment>> {
    return apiFetch<AdminAssignment>(`/admin/companies/${companyId}/users`, {
      method: 'POST',
      body: JSON.stringify({ user_email: userEmail, role_id: roleId }),
    });
  },

  async importBudget(file: File): Promise<ApiResponse<{ rows_imported: number; errors: string[] }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/admin/budget/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      return { data: null, error: 'Import failed', status: response.status };
    }
    
    return { data: await response.json(), error: null, status: response.status };
  },

  async getBudgetTemplate(): Promise<Blob> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/admin/budget/template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.blob();
  },
};

export const FOAPI = {
  async getMyCompanies(): Promise<ApiResponse<Company[]>> {
    return apiFetch<Company[]>('/fo/companies');
  },

  async getPeriods(companyId: string, year?: number): Promise<ApiResponse<{
    year: number;
    month: number;
    month_name: string;
    has_budget: boolean;
    has_actual: boolean;
    report_status: string | null;
    report_id: string | null;
  }[]>> {
    const query = year ? `?year=${year}` : '';
    return apiFetch(`/fo/periods/${companyId}${query}`);
  },

  async getMyReports(status?: string, year?: number): Promise<ApiResponse<{ reports: Report[]; total: number }>> {
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    if (year) params.append('year', year.toString());
    return apiFetch(`/fo/reports?${params}`);
  },

  async createReport(companyId: string, year: number, month: number): Promise<ApiResponse<Report>> {
    return apiFetch<Report>('/fo/reports', {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId, year, month }),
    });
  },

  async getReport(reportId: string): Promise<ApiResponse<ReportDetail>> {
    return apiFetch<ReportDetail>(`/fo/reports/${reportId}`);
  },

  async saveFinancials(reportId: string, data: Partial<FinancialData>): Promise<ApiResponse<FinancialData>> {
    return apiFetch<FinancialData>(`/fo/reports/${reportId}/financials`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async submitReport(reportId: string, comment?: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiFetch(`/fo/reports/${reportId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ fo_comment: comment }),
    });
  },

  async getBudget(companyId: string, year: number, month: number): Promise<ApiResponse<FinancialData | null>> {
    return apiFetch<FinancialData | null>(`/fo/budget/${companyId}/${year}/${month}`);
  },

  async getUserClusters(): Promise<ApiResponse<{ cluster_id: string; cluster_name: string }[]>> {
    return apiFetch('/fo/user-clusters');
  },

  async getUserCompanies(clusterId?: string): Promise<ApiResponse<{
    company_id: string;
    company_name: string;
    cluster_id: string;
    fin_year_start_month: number | null;
  }[]>> {
    const query = clusterId ? `?cluster_id=${clusterId}` : '';
    return apiFetch(`/fo/user-companies${query}`);
  },

  async checkPeriod(year: number, month: number): Promise<ApiResponse<{
    allowed: boolean;
    message: string;
    end_date: string | null;
    days_exceeded: number | null;
  }>> {
    return apiFetch(`/fo/check-period?year=${year}&month=${month}`);
  },

  async getBudgetData(companyId: string, year: number, month: number): Promise<ApiResponse<{
    company_id: string;
    period_id: number;
    year: number;
    month: number;
    metrics: Record<number, number>;
  } | null>> {
    return apiFetch(`/fo/budget-data/${companyId}/${year}/${month}`);
  },

  async saveActuals(data: {
    company_id: string;
    year: number;
    month: number;
    revenue: number;
    gp: number;
    other_income: number;
    personal_exp: number;
    admin_exp: number;
    selling_exp: number;
    finance_exp: number;
    depreciation: number;
    provisions: number;
    exchange_gl: number;
    non_ops_exp: number;
    non_ops_income: number;
    comment?: string;
    is_submit: boolean;
  }): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiFetch('/fo/save-actuals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const FDAPI = {
  async getPendingReports(): Promise<ApiResponse<{ reports: PendingReport[]; total: number }>> {
    return apiFetch('/fd/pending');
  },

  async getReports(filters?: { status?: string; year?: number; month?: number }): Promise<ApiResponse<{ reports: PendingReport[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status_filter', filters.status);
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.month) params.append('month', filters.month.toString());
    return apiFetch(`/fd/reports?${params}`);
  },

  async getReport(reportId: string): Promise<ApiResponse<ReportDetail & {
    variance: Record<string, any> | null;
    status_history: any[];
    can_approve: boolean;
    can_reject: boolean;
  }>> {
    return apiFetch(`/fd/reports/${reportId}`);
  },

  async approveReport(reportId: string, comment?: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiFetch(`/fd/reports/${reportId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  async rejectReport(reportId: string, reason: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiFetch(`/fd/reports/${reportId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async addComment(reportId: string, content: string): Promise<ApiResponse<{ success: boolean; comment_id: string }>> {
    return apiFetch(`/fd/reports/${reportId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async getDashboard(): Promise<ApiResponse<{
    pending_review: number;
    approved_this_month: number;
    rejected_this_month: number;
    total_companies: number;
    companies_submitted: number;
    companies_pending: number;
  }>> {
    return apiFetch('/fd/dashboard');
  },
};

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// CEO Dashboard API
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export const CEOAPI = {
  async getDashboard(year?: number, month?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return apiFetch(`/ceo/dashboard?${params}`);
  },

  async getYTD(year: number, throughMonth?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (throughMonth) params.append('through_month', throughMonth.toString());
    return apiFetch(`/ceo/ytd/${year}?${params}`);
  },

  async getClusterDetail(clusterId: string, year?: number, month?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return apiFetch(`/ceo/clusters/${clusterId}?${params}`);
  },

  async getRankings(year: number, month: number, metric?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (metric) params.append('metric', metric);
    return apiFetch(`/ceo/rankings/${year}/${month}?${params}`);
  },

  async getTrends(params?: { company_id?: string; year_from?: number; year_to?: number; metrics?: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.company_id) queryParams.append('company_id', params.company_id);
    if (params?.year_from) queryParams.append('year_from', params.year_from.toString());
    if (params?.year_to) queryParams.append('year_to', params.year_to.toString());
    if (params?.metrics) queryParams.append('metrics', params.metrics);
    return apiFetch(`/ceo/trends?${queryParams}`);
  },
};

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// MD Dashboard API
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export const MDAPI = {
  async getStrategicOverview(mode: 'month' | 'ytd', year?: number, month?: number): Promise<ApiResponse<StrategicOverview>> {
    const params = new URLSearchParams({ mode });
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return apiFetch<StrategicOverview>(`/md/strategic-overview?${params}`);
  },

  async getPerformers(mode: 'month' | 'ytd', year?: number, month?: number, topN?: number): Promise<ApiResponse<PerformersResponse>> {
    const params = new URLSearchParams({ mode });
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    if (topN) params.append('top_n', topN.toString());
    return apiFetch<PerformersResponse>(`/md/performers?${params}`);
  },

  async getClusterContribution(mode: 'month' | 'ytd', year?: number, month?: number): Promise<ApiResponse<ContributionResponse>> {
    const params = new URLSearchParams({ mode });
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return apiFetch<ContributionResponse>(`/md/cluster-contribution?${params}`);
  },

  async getRiskRadar(mode: 'month' | 'ytd', year?: number, month?: number): Promise<ApiResponse<RiskRadarResponse>> {
    const params = new URLSearchParams({ mode });
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return apiFetch<RiskRadarResponse>(`/md/risk-radar?${params}`);
  },

  async getClusterDrilldown(clusterId: string, mode: 'month' | 'ytd', year?: number, month?: number): Promise<ApiResponse<ClusterDrilldownResponse>> {
    const params = new URLSearchParams({ mode });
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return apiFetch<ClusterDrilldownResponse>(`/md/drilldown/cluster/${clusterId}?${params}`);
  },

  async getPBTTrend(params?: { company_id?: string; cluster_id?: string; start_year?: number; end_year?: number }): Promise<ApiResponse<PBTTrendResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.company_id) queryParams.append('company_id', params.company_id);
    if (params?.cluster_id) queryParams.append('cluster_id', params.cluster_id);
    if (params?.start_year) queryParams.append('start_year', params.start_year.toString());
    if (params?.end_year) queryParams.append('end_year', params.end_year.toString());
    return apiFetch<PBTTrendResponse>(`/md/pbt-trend?${queryParams}`);
  },

  async getPerformanceHierarchy(year?: number, month?: number): Promise<ApiResponse<PerformanceHierarchyResponse>> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return apiFetch<PerformanceHierarchyResponse>(`/md/performance-hierarchy?${params}`);
  },
};

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Health Check API (existing)
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export const HealthAPI = {
  async check(): Promise<ApiResponse<{ status: string; service: string }>> {
    return apiFetch('/health');
  },

  async full(): Promise<ApiResponse<{
    status: string;
    timestamp: string;
    components: {
      database: { status: string; latency_ms?: number };
      redis: { status: string; latency_ms?: number };
      email: { status: string };
    };
  }>> {
    return apiFetch('/health/full');
  },
};

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// Utility Hooks (for convenience)
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export function formatCurrency(value: number, inMillions: boolean = false): string {
  if (inMillions) {
    return `LKR ${(value / 1e6).toFixed(1)}M`;
  }
  return `LKR ${value.toLocaleString()}`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getMonthName(month: number): string {
  const months = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month] || '';
}

export function getShortMonthName(month: number): string {
  const months = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[month] || '';
}

