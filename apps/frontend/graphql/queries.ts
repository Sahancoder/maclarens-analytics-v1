import { gql } from '@apollo/client';

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      name
      role
      company {
        id
        name
      }
      cluster {
        id
        name
      }
    }
  }
`;

export const GET_REPORTS = gql`
  query GetReports($status: ReportStatus, $limit: Int, $offset: Int) {
    reports(status: $status, limit: $limit, offset: $offset) {
      items {
        id
        title
        status
        createdAt
        updatedAt
        author {
          id
          name
        }
        company {
          id
          name
        }
      }
      totalCount
    }
  }
`;

export const GET_REPORT_BY_ID = gql`
  query GetReportById($id: ID!) {
    report(id: $id) {
      id
      title
      status
      data
      createdAt
      updatedAt
      author {
        id
        name
        email
      }
      company {
        id
        name
      }
      approvals {
        id
        status
        approver {
          id
          name
        }
        approvedAt
        comments
      }
    }
  }
`;

export const GET_ANALYTICS_SUMMARY = gql`
  query GetAnalyticsSummary($clusterId: ID, $timeRange: TimeRange!) {
    analyticsSummary(clusterId: $clusterId, timeRange: $timeRange) {
      totalRevenue
      totalExpenses
      netProfit
      companyCount
      reportCount
      complianceRate
      trends {
        date
        revenue
        expenses
      }
    }
  }
`;
