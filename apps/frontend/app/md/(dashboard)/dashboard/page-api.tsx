/**
 * ============================================
 * MD Dashboard - API-Connected Version
 * ============================================
 * 
 * This is a sample refactored dashboard that uses the API client
 * instead of hardcoded mock data.
 * 
 * Key changes:
 * - Uses useStrategicOverview hook for main metrics
 * - Uses usePerformers hook for top/bottom performers
 * - Uses useClusterContribution hook for cluster data
 * - Proper loading, error, and empty states
 * - No Math.random() or hardcoded arrays
 */

"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  DollarSign,
  Building2,
  X,
  Calendar,
  Globe,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

// Import API client and hooks
import {
  useStrategicOverview,
  usePerformers,
  useClusterContribution,
  useRiskRadar,
  usePBTTrend,
  usePerformanceHierarchy,
} from "@/hooks/use-api";
import {
  LoadingSpinner,
  LoadingCard,
  ErrorState,
  EmptyState,
  ValueDisplay,
  ApiStateWrapper,
  SkeletonCard,
} from "@/components/ui/api-states";
import {
  StrategicOverview,
  PerformersResponse,
  ContributionResponse,
  ClusterContribution,
  formatCurrency,
  formatPercentage,
  getMonthName,
} from "@/lib/api-client";

// ============ HELPER FUNCTIONS ============

const formatFinancialValue = (value: number, inMillions: boolean = true): string => {
  if (inMillions) {
    return `LKR ${(Math.abs(value) / 1e6).toFixed(1)}M`;
  }
  return `LKR ${value.toLocaleString()}`;
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "critical":
      return { bg: "bg-red-500", text: "text-red-600", light: "bg-red-50", border: "border-red-200" };
    case "high":
      return { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50", border: "border-amber-200" };
    case "medium":
      return { bg: "bg-yellow-500", text: "text-yellow-600", light: "bg-yellow-50", border: "border-yellow-200" };
    default:
      return { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50", border: "border-emerald-200" };
  }
};

const CHART_COLORS = ["#0b1f3a", "#16a34a", "#2563eb", "#f97316", "#a855f7", "#ef4444", "#14b8a6", "#eab308"];

// ============ KPI TILE COMPONENT ============

interface KPITileProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  loading?: boolean;
  isFavorable?: boolean;
}

function KPITile({ title, value, subtitle, change, changeLabel, icon, loading, isFavorable }: KPITileProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-3 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-4 bg-slate-200 rounded" />
        </div>
        <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
        <div className="h-3 w-24 bg-slate-200 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">{title}</span>
        <div className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0">{icon}</div>
      </div>
      <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#0b1f3a] truncate">{value}</p>
      {(change !== undefined || subtitle) && (
        <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap">
          {change !== undefined && (
            <span
              className={`flex items-center text-[10px] sm:text-xs font-medium ${
                isFavorable ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {isFavorable ? (
                <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              ) : (
                <ArrowDownRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              )}
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          )}
          {changeLabel && <span className="text-[10px] sm:text-xs text-slate-400">{changeLabel}</span>}
          {subtitle && <span className="text-[10px] sm:text-xs text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

// ============ PERFORMERS TABLE ============

interface PerformersTableProps {
  title: string;
  performers: Array<{
    rank: number;
    company_name: string;
    cluster_name: string;
    achievement_pct: number;
    formatted_pbt: string;
  }>;
  isTop: boolean;
  loading?: boolean;
}

function PerformersTable({ title, performers, isTop, loading }: PerformersTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!performers.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">{title}</h3>
        <EmptyState title="No data available" description="No performers to display for this period." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="space-y-2">
        {performers.map((p) => (
          <div key={p.rank} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-3">
              <span
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                  isTop ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {p.rank}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">{p.company_name}</p>
                <p className="text-xs text-slate-500">{p.cluster_name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">{p.formatted_pbt}</p>
              <p
                className={`text-xs font-medium ${
                  p.achievement_pct >= 100 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {p.achievement_pct.toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ CLUSTER CONTRIBUTION CHART ============

interface ContributionChartProps {
  data: ClusterContribution[];
  loading?: boolean;
}

function ContributionChart({ data, loading }: ContributionChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-80">
        <div className="h-5 w-48 bg-slate-200 rounded mb-4" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-80 flex items-center justify-center">
        <EmptyState title="No contribution data" description="No cluster data available for this period." />
      </div>
    );
  }

  // Sort by contribution for chart
  const chartData = [...data]
    .sort((a, b) => b.pbt_contribution_pct - a.pbt_contribution_pct)
    .map((c) => ({
      name: c.cluster_name,
      value: c.pbt_contribution_pct,
      pbt: c.pbt,
      risk: c.pbt_achievement_pct >= 90 ? "low" : c.pbt_achievement_pct >= 70 ? "medium" : "high",
    }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">Cluster Contribution Analysis</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Contribution"]}
            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#16a34a" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============ MAIN DASHBOARD COMPONENT ============

export default function MDDashboardWithAPI() {
  // Period selection state
  const [overviewMode, setOverviewMode] = useState<"month" | "ytd">("month");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Currency state
  const [currency, setCurrency] = useState<"LKR" | "USD">("LKR");
  const [exchangeRate, setExchangeRate] = useState<number>(300);

  // Fetch data using hooks
  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
    isEmpty: overviewEmpty,
    refetch: refetchOverview,
  } = useStrategicOverview(overviewMode, selectedYear, selectedMonth);

  const {
    data: performers,
    loading: performersLoading,
    error: performersError,
  } = usePerformers(overviewMode, selectedYear, selectedMonth);

  const {
    data: contribution,
    loading: contributionLoading,
    error: contributionError,
  } = useClusterContribution(overviewMode, selectedYear, selectedMonth);

  // Available months/years for dropdown
  const availableMonths = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const availableYears = [2023, 2024, 2025, 2026];

  // Currency conversion helpers
  const convertValue = (val: number) => (currency === "USD" ? val / exchangeRate : val);

  const formatFinancial = (val: number) => {
    const converted = convertValue(val);
    if (currency === "USD") {
      return `$${(Math.abs(converted) / 1e6).toFixed(2)}M`;
    }
    return `LKR ${(Math.abs(converted) / 1e6).toFixed(1)}M`;
  };

  return (
    <div className="min-h-full bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Group Strategic Overview</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Unified view: Group → Cluster → Company
              {currency === "USD" && ` • Converted @ ${exchangeRate} LKR/USD`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Currency Controls */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
              <div className="flex items-center px-3 py-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wide">USD RATE</span>
                <span className="text-sm font-medium text-slate-500 mr-1.5">LKR</span>
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-20 bg-transparent text-lg font-bold text-[#0b1f3a] focus:outline-none text-right border-b border-transparent focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                onClick={() => setCurrency((c) => (c === "LKR" ? "USD" : "LKR"))}
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-all ${
                  currency === "USD"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 bg-slate-100"
                }`}
              >
                <Globe className="h-4 w-4" />
                {currency}
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            {/* Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setOverviewMode("month")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  overviewMode === "month" ? "bg-white text-[#0b1f3a] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setOverviewMode("ytd")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  overviewMode === "ytd" ? "bg-white text-[#0b1f3a] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                YTD
              </button>
            </div>

            {/* Month & Year Selectors */}
            {overviewMode === "month" && (
              <>
                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs font-medium text-slate-600 hidden sm:block">Month:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 focus:border-[#0b1f3a]"
                  >
                    {availableMonths.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs font-medium text-slate-600 hidden sm:block">Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 focus:border-[#0b1f3a]"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {overviewMode === "ytd" && (
              <div className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-medium flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>YTD {selectedYear}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {overviewError && (
          <div className="mb-6">
            <ErrorState
              title="Failed to load dashboard"
              message={overviewError}
              onRetry={refetchOverview}
            />
          </div>
        )}

        {/* KPI Tiles */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
          <KPITile
            title="Revenue"
            value={overview ? formatFinancial(overview.revenue.actual) : "—"}
            change={overview?.revenue.variance_pct ?? undefined}
            changeLabel="vs Budget"
            icon={<DollarSign />}
            loading={overviewLoading}
            isFavorable={overview?.revenue.is_favorable}
          />
          <KPITile
            title="GP"
            value={overview ? formatFinancial(overview.gp.actual) : "—"}
            change={overview?.gp.variance_pct ?? undefined}
            changeLabel="vs Budget"
            icon={<DollarSign />}
            loading={overviewLoading}
            isFavorable={overview?.gp.is_favorable}
          />
          <KPITile
            title="GP Margin"
            value={overview ? `${overview.gp_margin.actual.toFixed(1)}%` : "—"}
            change={overview?.gp_margin.variance_pct ?? undefined}
            changeLabel="vs Budget"
            icon={<Activity />}
            loading={overviewLoading}
            isFavorable={overview?.gp_margin.is_favorable}
          />
          <KPITile
            title="Total Overhead"
            value={overview ? formatFinancial(overview.total_overhead.actual) : "—"}
            change={overview?.total_overhead.variance_pct ?? undefined}
            changeLabel="vs Budget"
            icon={<Activity />}
            loading={overviewLoading}
            isFavorable={overview?.total_overhead.is_favorable}
          />
          <KPITile
            title="Actual PBT"
            value={overview ? formatFinancial(overview.pbt.actual) : "—"}
            change={overview?.pbt.variance_pct ?? undefined}
            changeLabel="vs Budget"
            icon={<TrendingUp />}
            loading={overviewLoading}
            isFavorable={overview?.pbt.is_favorable}
          />
          <KPITile
            title="PBT Achievement"
            value={overview ? `${overview.pbt_achievement.actual.toFixed(1)}%` : "—"}
            subtitle={overview ? `${overview.companies_approved}/${overview.companies_total} approved` : ""}
            icon={<Target />}
            loading={overviewLoading}
            isFavorable={overview ? overview.pbt_achievement.actual >= 100 : undefined}
          />
        </div>

        {/* Top/Bottom Performers & Contribution Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Top Performers */}
          <PerformersTable
            title="🏆 Top 5 Performers"
            performers={performers?.top_performers ?? []}
            isTop={true}
            loading={performersLoading}
          />

          {/* Bottom Performers */}
          <PerformersTable
            title="⚠️ Bottom 5 Performers"
            performers={performers?.bottom_performers ?? []}
            isTop={false}
            loading={performersLoading}
          />

          {/* Cluster Contribution */}
          <ContributionChart
            data={contribution?.clusters ?? []}
            loading={contributionLoading}
          />
        </div>

        {/* Empty State when no data */}
        {overviewEmpty && !overviewLoading && !overviewError && (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <EmptyState
              title="No data for this period"
              description={`There is no approved financial data for ${
                overviewMode === "month"
                  ? `${availableMonths.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`
                  : `YTD ${selectedYear}`
              }. Data will appear once reports are submitted and approved.`}
            />
          </div>
        )}

        {/* Reporting Status Bar */}
        {overview && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Reporting Status</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {overview.companies_approved} of {overview.companies_total} companies have approved reports
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#0b1f3a]">
                    {((overview.companies_approved / overview.companies_total) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-slate-500">Completion Rate</p>
                </div>
                <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${(overview.companies_approved / overview.companies_total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center text-xs text-slate-400 mt-8">
          Data refreshes automatically. Last sync: {overview?.period ?? "—"}
        </div>
      </div>
    </div>
  );
}
