/**
 * GraphQL Client for McLarens Analytics
 */

const API_URL = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:8000/graphql';

// server-side: use internal docker network
const INTERNAL_API_URL = process.env.INTERNAL_GRAPHQL_ENDPOINT || 'http://maclarens-backend:8000/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Docker Fix: SSR must use internal URL, Browser must use public URL
  const isServer = typeof window === 'undefined';
  const url = isServer ? INTERNAL_API_URL : API_URL;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    });

    if (!response.ok) {
       // Log error for debugging Docker networking issues
       const text = await response.text();
       console.error(`GraphQL Error [${response.status}]: ${text.slice(0, 100)}`);
       throw new Error(`Network error: ${response.status}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data as T;
  } catch (err) {
    console.error(`GraphQL Request Failed to ${url}`, err);
    throw err;
  }
}

// ============ AUTH QUERIES ============

export const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        name
        role
        companyId
        clusterId
      }
    }
  }
`;

export const ME_QUERY = `
  query Me {
    me {
      id
      email
      name
      role
      companyId
      clusterId
    }
  }
`;

// ============ ADMIN QUERIES ============

export const DASHBOARD_STATS_QUERY = `
  query DashboardStats {
    dashboardStats {
      totalUsers
      newUsersThisMonth
      activeCompanies
      inactiveCompanies
      totalClusters
      pendingReports
    }
  }
`;

export const USERS_QUERY = `
  query Users {
    users {
      id
      email
      name
      role
      companyId
      clusterId
      isActive
      createdAt
    }
  }
`;

export const CLUSTERS_QUERY = `
  query Clusters {
    clusters {
      id
      name
      code
      isActive
      companyCount
    }
  }
`;

export const COMPANIES_QUERY = `
  query Companies($clusterId: String) {
    companies(clusterId: $clusterId) {
      id
      name
      code
      clusterId
      clusterName
      isActive
    }
  }
`;

// ============ ANALYTICS QUERIES ============

export const CLUSTER_PERFORMANCE_QUERY = `
  query ClusterPerformance($year: Int!, $month: Int!) {
    clusterPerformance(year: $year, month: $month) {
      clusterId
      clusterName
      clusterCode
      monthly {
        actual
        budget
        variance
        variancePercent
        achievementPercent
      }
      ytd {
        actual
        budget
        variance
        variancePercent
        achievementPercent
      }
    }
  }
`;

export const COMPANY_PERFORMANCE_QUERY = `
  query CompanyPerformance($clusterId: String!, $year: Int!, $month: Int!) {
    companyPerformance(clusterId: $clusterId, year: $year, month: $month) {
      companyId
      companyName
      companyCode
      clusterName
      monthly {
        actual
        budget
        variance
        variancePercent
        achievementPercent
      }
      ytd {
        actual
        budget
        variance
        variancePercent
        achievementPercent
      }
    }
  }
`;

export const GROUP_KPIS_QUERY = `
  query GroupKPIs($year: Int!, $month: Int!) {
    groupKpis(year: $year, month: $month) {
      totalActual
      totalBudget
      totalVariance
      variancePercent
      groupHealthIndex
      pbtVsPriorYear
      ebitdaMargin
      cashPosition
    }
  }
`;

export const TOP_PERFORMERS_QUERY = `
  query TopPerformers($year: Int!, $month: Int!, $limit: Int) {
    topPerformers(year: $year, month: $month, limit: $limit) {
      rank
      name
      achievementPercent
      variance
    }
  }
`;

export const BOTTOM_PERFORMERS_QUERY = `
  query BottomPerformers($year: Int!, $month: Int!, $limit: Int) {
    bottomPerformers(year: $year, month: $month, limit: $limit) {
      rank
      name
      achievementPercent
      variance
    }
  }
`;

export const CEO_DASHBOARD_QUERY = `
  query CEODashboard($year: Int!, $month: Int!) {
    ceoDashboard(year: $year, month: $month) {
      groupKpis {
        totalActual
        totalBudget
        totalVariance
        variancePercent
        groupHealthIndex
        pbtVsPriorYear
        ebitdaMargin
        cashPosition
      }
      topPerformers {
        rank
        name
        achievementPercent
        variance
      }
      bottomPerformers {
        rank
        name
        achievementPercent
        variance
      }
      riskClusters {
        clusterName
        severity
        variancePercent
        classification
      }
      recentAlerts {
        id
        title
        severity
        timestamp
      }
      clusterPerformance {
        clusterId
        clusterName
        clusterCode
        monthly {
          actual
          budget
          variance
          variancePercent
          achievementPercent
        }
        ytd {
          actual
          budget
          variance
          variancePercent
          achievementPercent
        }
      }
    }
  }
`;

export const RISK_CLUSTERS_QUERY = `
  query RiskClusters($year: Int!, $month: Int!) {
    riskClusters(year: $year, month: $month) {
      clusterName
      severity
      variancePercent
      classification
    }
  }
`;

export const FORECAST_DATA_QUERY = `
  query ForecastData($year: Int!) {
    forecastData(year: $year) {
      month
      actual
      budget
      forecast
    }
  }
`;

export const CLUSTER_FORECASTS_QUERY = `
  query ClusterForecasts($year: Int!) {
    clusterForecasts(year: $year) {
      clusterName
      currentYtd
      projectedYearEnd
      budget
      variancePercent
    }
  }
`;

export const RUN_SCENARIO_QUERY = `
  query RunScenario($year: Int!, $month: Int!, $input: ScenarioInput!) {
    runScenario(year: $year, month: $month, input: $input) {
      scenarioName
      projectedPbt
      projectedRevenue
      impactPercent
    }
  }
`;

// ============ REPORT QUERIES ============

export const REPORTS_QUERY = `
  query Reports($status: ReportStatusEnum, $companyId: String, $year: Int, $month: Int) {
    reports(status: $status, companyId: $companyId, year: $year, month: $month) {
      id
      companyId
      companyName
      year
      month
      status
      submittedAt
      approvedAt
      rejectionReason
    }
  }
`;

export const PENDING_REPORTS_QUERY = `
  query PendingReports {
    pendingReports {
      id
      companyId
      companyName
      year
      month
      status
      submittedAt
    }
  }
`;

// ============ MUTATIONS ============

export const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      name
      role
    }
  }
`;

export const UPDATE_USER_MUTATION = `
  mutation UpdateUser($id: String!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      name
      role
      isActive
    }
  }
`;

export const DELETE_USER_MUTATION = `
  mutation DeleteUser($id: String!) {
    deleteUser(id: $id)
  }
`;

export const CREATE_CLUSTER_MUTATION = `
  mutation CreateCluster($input: CreateClusterInput!) {
    createCluster(input: $input) {
      id
      name
      code
    }
  }
`;

export const CREATE_COMPANY_MUTATION = `
  mutation CreateCompany($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      id
      name
      code
      clusterId
      clusterName
    }
  }
`;

export const SAVE_FINANCIAL_DATA_MUTATION = `
  mutation SaveFinancialData($input: FinancialDataInput!) {
    saveFinancialData(input: $input)
  }
`;

export const SUBMIT_REPORT_MUTATION = `
  mutation SubmitReport($id: String!) {
    submitReport(id: $id) {
      id
      status
      submittedAt
    }
  }
`;

export const APPROVE_REPORT_MUTATION = `
  mutation ApproveReport($id: String!) {
    approveReport(id: $id) {
      id
      status
      approvedAt
    }
  }
`;

export const REJECT_REPORT_MUTATION = `
  mutation RejectReport($id: String!, $reason: String!) {
    rejectReport(id: $id, reason: $reason) {
      id
      status
      rejectionReason
    }
  }
`;
