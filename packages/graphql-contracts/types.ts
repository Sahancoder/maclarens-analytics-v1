/**
 * Shared GraphQL type definitions
 */

export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };

export enum ReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum UserRole {
  DATA_OFFICER = 'DATA_OFFICER',
  DIRECTOR = 'DIRECTOR',
  CEO = 'CEO',
  ADMIN = 'ADMIN',
}

export enum TimeRange {
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: Maybe<string>;
  clusterId?: Maybe<string>;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  clusterId: string;
  isActive: boolean;
}

export interface Cluster {
  id: string;
  name: string;
  code: string;
  companyCount: number;
  isActive: boolean;
}

export interface Report {
  id: string;
  title: string;
  status: ReportStatus;
  data?: Maybe<string>;
  createdAt: string;
  updatedAt: string;
  author: User;
  company: Company;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  companyCount: number;
  reportCount: number;
  complianceRate: number;
}
