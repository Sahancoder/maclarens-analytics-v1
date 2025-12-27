/**
 * Shared Constants
 */

// User Roles
export const USER_ROLES = {
  DATA_OFFICER: 'DATA_OFFICER',
  DIRECTOR: 'DIRECTOR',
  CEO: 'CEO',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Report Statuses
export const REPORT_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type ReportStatus = typeof REPORT_STATUSES[keyof typeof REPORT_STATUSES];

// Time Ranges
export const TIME_RANGES = {
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  QUARTER: 'QUARTER',
  YEAR: 'YEAR',
} as const;

export type TimeRange = typeof TIME_RANGES[keyof typeof TIME_RANGES];

// Approval Workflow Steps
export const WORKFLOW_STEPS = {
  DATA_ENTRY: 'DATA_ENTRY',
  DIRECTOR_REVIEW: 'DIRECTOR_REVIEW',
  CEO_APPROVAL: 'CEO_APPROVAL',
  COMPLETED: 'COMPLETED',
} as const;

export type WorkflowStep = typeof WORKFLOW_STEPS[keyof typeof WORKFLOW_STEPS];

// Route Paths
export const ROUTES = {
  LOGIN: '/login',
  DATA_OFFICER: '/data-officer',
  DIRECTOR: '/director',
  CEO: '/ceo',
  ADMIN: '/admin',
} as const;

// Role to Route mapping
export const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  DATA_OFFICER: ROUTES.DATA_OFFICER,
  DIRECTOR: ROUTES.DIRECTOR,
  CEO: ROUTES.CEO,
  ADMIN: ROUTES.ADMIN,
};
