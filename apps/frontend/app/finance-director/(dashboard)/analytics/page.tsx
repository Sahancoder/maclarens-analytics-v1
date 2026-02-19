"use client";

// =============================================================================
// Company Analytics Page - Finance Director Dashboard
// =============================================================================
// This page displays real-time analytics for a selected company assigned to
// the logged-in Financial Director. All data is fetched live from the backend
// API which queries the FINANCIAL_FACT table and calculates KPIs server-side.
//
// Sections:
// 1. Monthly Performance KPIs (GP Margin, GP, PBT Before, PBT Achievement)
// 2. Yearly/YTD Performance KPIs (same metrics year-to-date)
// 3. Actual PBT Comparison chart (Before vs After, monthly & yearly toggle)
// 4. PBT Before - Monthly Trend line chart
// 5. Profitability Margins (GP Margin & NP Margin lines)
// 6. Expense Breakdown pie chart (current month)
// 7. Monthly Performance card (Actual PBT, Budget PBT, Achievement)
// =============================================================================
import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
// Icons used across the page
import { TrendingUp, TrendingDown, Building2, ChevronDown, Trophy, Search, X } from "lucide-react";
// API client for backend calls – uses FDAPI (not FO) so only FD-assigned companies appear
import { FDAPI, type CompanyAnalyticsData } from "@/lib/api-client";
// ---------------------------------------------------------------
// Month list for dropdowns (value = 1-12, label = full name)
// ---------------------------------------------------------------
const MONTHS = [
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
// ---------------------------------------------------------------
// Simple company interface for the company dropdown
// ---------------------------------------------------------------
interface Company {
  id: string;
  name: string;
}
// ---------------------------------------------------------------
// KPICard - Reusable tile for Monthly / YTD KPI display
// Shows: label, formatted value, YoY change badge, trend arrow
// ---------------------------------------------------------------
function KPICard({
  label,
  value,
  change,
  trend,
}: {
  label: string;   // e.g. "GP Margin (Monthly)"
  value: string;   // formatted display string e.g. "34.0%"
  change: string;  // e.g. "+1.5% vs last year"
  trend: string;   // "up" | "down" | "neutral"
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Top row: label + trend icon */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">{label}</span>
        {/* Show green arrow for positive trend, red for negative */}
        {trend === "up" ? (
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        ) : trend === "down" ? (
          <TrendingDown className="h-4 w-4 text-red-500" />
        ) : (
          // Neutral - no trend data available
          <div className="h-4 w-4" />
        )}
      </div>
      {/* Main value */}
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {/* YoY change text */}
      <div
        className={`text-sm mt-1 ${
          trend === "up"
            ? "text-emerald-600"   // positive = green
            : trend === "down"
            ? "text-red-600"       // negative = red
            : "text-slate-400"     // no data = grey
        }`}
      >
        {change}
      </div>
    </div>
  );
}
// ---------------------------------------------------------------
// ChartCard - Wrapper component for chart sections
// Provides consistent styling: white card, title, description
// ---------------------------------------------------------------
function ChartCard({
  title,
  description,
  children,
}: {
  title: string;       // Chart heading
  description: string; // Subtitle / explanation
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
// ---------------------------------------------------------------
// Utility: format large numbers into human-readable strings
// e.g. 1200000 -> "1.2M", 450000 -> "450K"
// ---------------------------------------------------------------
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

// Unified Achievement Formula
// (1 + SIGN(Budget) * ((Actual - Budget) / Budget)) * 100
const calculateAchievement = (actual: number | null | undefined, budget: number | null | undefined) => {
  if (budget === 0 || budget === null || budget === undefined || actual === null || actual === undefined) return 0; // Handle division by zero / no budget
  const sign = budget >= 0 ? 1 : -1;
  return (1 + sign * ((actual - budget) / budget)) * 100;
};
// ---------------------------------------------------------------
// Utility: format YoY change string for KPI card
// e.g. 1.5 -> "+1.5% vs last year", -2.3 -> "-2.3% vs last year"
// ---------------------------------------------------------------
function formatYoY(val: number | null): { change: string; trend: string } {
  if (val === null || val === undefined) {
    return { change: "No prior year data", trend: "neutral" };
  }
  // Determine direction: positive is up, negative is down
  const sign = val >= 0 ? "+" : "";
  const trend = val >= 0 ? "up" : "down";
  return { change: `${sign}${val.toFixed(1)}% vs last year`, trend };
}
// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================
export default function AnalyticsPage() {
  // -- Current date defaults --
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JS months are 0-indexed
  // -- Company selection state --
  // We fetch assigned companies directly from FDAPI (not the FO hook)
  // so each FD only sees their own mapped companies
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  // -- Period selection state --
  // Monthly performance: which month to show
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  // -- Analytics data from API --
  const [analytics, setAnalytics] = useState<CompanyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // -- PBT comparison chart toggle (monthly vs yearly view) --
  const [pbtViewMode, setPbtViewMode] = useState<"monthly" | "yearly">("monthly");
  // -- Company Rank state --
  const [rankData, setRankData] = useState<{
    rank: number;
    total_companies: number;
    pbt_before_actual: number | null;
  } | null>(null);
  const [rankLoading, setRankLoading] = useState(false);
  // -- Searchable company dropdown state --
  const [companySearch, setCompanySearch] = useState("");
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCompanyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // ---------------------------------------------------------------
  // Effect: Fetch FD-assigned companies from /fd/companies
  // Each FD only sees companies mapped to them in user_company_role_map
  // Also restores previously selected company from localStorage
  // ---------------------------------------------------------------
  useEffect(() => {
    const loadCompanies = async () => {
      setCompaniesLoading(true);
      try {
        // Call FD-specific endpoint (not FO) so only assigned companies appear
        const res = await FDAPI.getMyCompanies();
        if (res.data && res.data.length > 0) {
          // Map backend objects to simplified {id, name} format
          const mapped = res.data.map((c: any) => ({
            id: c.id || c.company_id,
            name: c.name || c.company_name,
          }));
          setCompanies(mapped);
          // Restore last selected company from localStorage if valid
          const savedId = localStorage.getItem("fd_selected_company");
          const validSaved = mapped.find((c: Company) => c.id === savedId)?.id;
          // Use saved company or default to first in list
          setSelectedCompanyId(validSaved || mapped[0].id);
        } else {
          setCompanies([]);
        }
      } catch {
        setCompanies([]);
      } finally {
        setCompaniesLoading(false);
      }
    };
    loadCompanies();
  }, []);
  // ---------------------------------------------------------------
  // Fetch analytics data from backend when company or month changes
  // Calls: GET /fd/company-analytics?company_id=...&year=...&month=...
  // ---------------------------------------------------------------
  const fetchAnalytics = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      // Call the backend company-analytics endpoint
      const res = await FDAPI.getCompanyAnalytics(
        selectedCompanyId,
        selectedYear,
        selectedMonth
      );
      if (res.data) {
        setAnalytics(res.data);
      } else {
        // API returned an error - show the message
        setError(res.error || "Failed to load analytics");
        setAnalytics(null);
      }
    } catch (err) {
      setError("Network error loading analytics");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedYear, selectedMonth]);
  // Trigger fetch whenever company or period selection changes
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);
  // ---------------------------------------------------------------
  // Persist company selection to localStorage for next visit
  // ---------------------------------------------------------------
  useEffect(() => {
    if (selectedCompanyId) {
      localStorage.setItem("fd_selected_company", selectedCompanyId);
    }
  }, [selectedCompanyId]);
  // ---------------------------------------------------------------
  // Fetch company rank (separate lightweight call)
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!selectedCompanyId) return;
    const fetchRank = async () => {
      setRankLoading(true);
      // Use current real month for ranking
      const res = await FDAPI.getCompanyRank(selectedCompanyId, currentYear, currentMonth);
      if (res.data) {
        setRankData({
          rank: res.data.rank,
          total_companies: res.data.total_companies,
          pbt_before_actual: res.data.pbt_before_actual,
        });
      } else {
        setRankData(null);
      }
      setRankLoading(false);
    };
    fetchRank();
  }, [selectedCompanyId, currentYear, currentMonth]);
  // ---------------------------------------------------------------
  // Derived display values from analytics state
  // ---------------------------------------------------------------
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  // Filtered companies for searchable dropdown
  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );
  // ---------------------------------------------------------------
  // Build Monthly KPI tile data from API response
  // Each tile: { label, value, change, trend }
  // ---------------------------------------------------------------
  const monthlyKpiTiles = analytics
    ? [
        {
          // GP Margin = (GP / Revenue) * 100 - shows as percentage
          label: "GP Margin (Monthly)",
          value: analytics.monthly_kpi.gp_margin !== null
            ? `${analytics.monthly_kpi.gp_margin.toFixed(1)}%`
            : "\u2014",
          ...formatYoY(analytics.monthly_kpi.gp_margin_yoy),
        },
        {
          // GP = Gross Profit amount for selected month
          label: "GP (Monthly)",
          value: analytics.monthly_kpi.gp !== null
            ? formatCurrency(analytics.monthly_kpi.gp)
            : "\u2014",
          ...formatYoY(analytics.monthly_kpi.gp_yoy),
        },
        {
          // PBT Before = Operational Profit Before Tax (before adjustments)
          label: "PBT Before (Monthly)",
          value: analytics.monthly_kpi.pbt_before !== null
            ? formatCurrency(analytics.monthly_kpi.pbt_before)
            : "\u2014",
          ...formatYoY(analytics.monthly_kpi.pbt_before_yoy),
        },
        {
          // PBT Achievement = Unified Formula
          label: "PBT Achievement (Monthly)",
          value: analytics.performance_monthly?.budget_pbt
            ? `${calculateAchievement(analytics.performance_monthly.actual_pbt, analytics.performance_monthly.budget_pbt).toFixed(1)}%`
            : "\u2014",
          // For achievement, trend is up if >= 100%, down if < 100%
          change: analytics.performance_monthly?.budget_pbt
            ? `${calculateAchievement(analytics.performance_monthly.actual_pbt, analytics.performance_monthly.budget_pbt) >= 100 ? "On" : "Below"} target`
            : "No budget data",
          trend: analytics.performance_monthly?.budget_pbt
            ? calculateAchievement(analytics.performance_monthly.actual_pbt, analytics.performance_monthly.budget_pbt) >= 100
              ? "up"
              : "down"
            : "neutral",
        },
      ]
    : [];
  // ---------------------------------------------------------------
  // Build Yearly/YTD KPI tile data from API response
  // Year-To-Date values aggregated from FY start to selected month
  // ---------------------------------------------------------------
  const yearlyKpiTiles = analytics
    ? [
        {
          // YTD GP Margin = SUM(YTD GP) / SUM(YTD Revenue) * 100
          label: "YTD GP Margin",
          value: analytics.yearly_kpi.ytd_gp_margin !== null
            ? `${analytics.yearly_kpi.ytd_gp_margin.toFixed(1)}%`
            : "\u2014",
          ...formatYoY(analytics.yearly_kpi.ytd_gp_margin_yoy),
        },
        {
          // YTD GP = SUM of GP for all periods in FY range
          label: "YTD GP",
          value: analytics.yearly_kpi.ytd_gp !== null
            ? formatCurrency(analytics.yearly_kpi.ytd_gp)
            : "\u2014",
          ...formatYoY(analytics.yearly_kpi.ytd_gp_yoy),
        },
        {
          // YTD PBT Before = SUM of PBT_BEFORE for YTD period range
          label: "YTD PBT Before",
          value: analytics.yearly_kpi.ytd_pbt_before !== null
            ? formatCurrency(analytics.yearly_kpi.ytd_pbt_before)
            : "\u2014",
          ...formatYoY(analytics.yearly_kpi.ytd_pbt_before_yoy),
        },
        {
          // PBT Achievement YTD = Unified Formula
          label: "PBT Achievement (YTD)",
          value: analytics.performance_yearly?.budget_pbt
            ? `${calculateAchievement(analytics.performance_yearly.actual_pbt, analytics.performance_yearly.budget_pbt).toFixed(1)}%`
            : "\u2014",
          change: analytics.performance_yearly?.budget_pbt
            ? `${calculateAchievement(analytics.performance_yearly.actual_pbt, analytics.performance_yearly.budget_pbt) >= 100 ? "On" : "Below"} target`
            : "No budget data",
          trend: analytics.performance_yearly?.budget_pbt
            ? calculateAchievement(analytics.performance_yearly.actual_pbt, analytics.performance_yearly.budget_pbt) >= 100
              ? "up"
              : "down"
            : "neutral",
        },
      ]
    : [];
  // ---------------------------------------------------------------
  // Chart data: PBT Comparison, Trend, Profitability, Expenses
  // Directly use API arrays (already in the correct format)
  // ---------------------------------------------------------------
  const pbtCompMonthly = analytics?.pbt_comparison_monthly || [];
  const pbtCompYearly = analytics?.pbt_comparison_yearly || [];
  const pbtTrend = analytics?.pbt_trend || [];
  const profitabilityData = analytics?.profitability || [];
  const expenseBreakdown = analytics?.expense_breakdown || [];
  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-6">
        {/* ================================================================
            HEADER: Company name + company selector dropdown
            No Export button per requirement
        ================================================================ */}
        <div className="flex items-center justify-between mb-6">
          {/* Left: icon + company name */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#0b1f3a]/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-[#0b1f3a]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {/* Show selected company name or loading placeholder */}
                {selectedCompany?.name || "Select a Company"}
              </h1>
              <p className="text-sm text-slate-500">Company Analytics Dashboard</p>
            </div>
          </div>
          {/* Right: Searchable Company selector dropdown */}
          <div className="flex items-center gap-3">
            {companies.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                  className="h-10 pl-3 pr-8 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 cursor-pointer min-w-[280px] text-left truncate"
                  disabled={loading}
                >
                  {selectedCompany?.name || "Select a Company"}
                </button>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                {/* Dropdown panel with search */}
                {companyDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-[360px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-slate-100">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search company..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="w-full h-9 pl-8 pr-8 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 focus:bg-white"
                          autoFocus
                        />
                        {companySearch && (
                          <button
                            onClick={() => setCompanySearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2"
                          >
                            <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Company list */}
                    <div className="max-h-64 overflow-y-auto">
                      {filteredCompanies.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-400 text-center">
                          No companies found
                        </div>
                      ) : (
                        filteredCompanies.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCompanyId(c.id);
                              setCompanyDropdownOpen(false);
                              setCompanySearch("");
                            }}
                            className={`w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${
                              c.id === selectedCompanyId
                                ? "bg-[#0b1f3a]/5 text-[#0b1f3a] font-medium"
                                : "text-slate-700"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Spinner while data is loading */}
            {loading && (
              <div className="h-5 w-5 border-2 border-[#0b1f3a] border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
        {/* ================================================================
            ERROR BANNER - shown when API call fails
        ================================================================ */}
        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {/* ================================================================
            COMPANY RANK CARD - shows ranking among FD's companies
            Based on monthly PBT Before (Actual) from backend
        ================================================================ */}
        {selectedCompanyId && (
          <div className="mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-6">
              <div className="h-14 w-14 rounded-xl bg-[#0b1f3a]/10 flex items-center justify-center shrink-0">
                {rankLoading ? (
                  <div className="h-5 w-5 border-2 border-[#0b1f3a] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trophy className="h-6 w-6 text-[#0b1f3a]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Company Rank
                </h3>
                {rankData ? (
                  <>
                    <p className="text-2xl font-bold text-slate-900 mt-0.5">
                      #{rankData.rank}{" "}
                      <span className="text-base font-medium text-slate-400">
                        of {rankData.total_companies}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Based on monthly PBT Before (Actual)
                      {rankData.pbt_before_actual != null && (
                        <span className="ml-2 text-slate-600 font-medium">
                          PBT: LKR{" "}
                          {rankData.pbt_before_actual.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-lg text-slate-400 mt-1">
                    {rankLoading ? "Loading..." : "No rank data"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ================================================================
            SECTION 1: MONTHLY PERFORMANCE KPIs
            4 tiles showing GP Margin, GP, PBT Before, PBT Achievement
            Each with YoY comparison (same month last year)
            Dropdown to select which month to analyse
        ================================================================ */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Monthly Performance
            </h3>
            {/* Month selector dropdown - changes selectedMonth state */}
            <div className="flex items-center gap-2">
              {/* Year selector for the monthly section - past 3 + 4 forward */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-9 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20"
              >
                {/* Show past 3 years + current + 4 forward years */}
                {Array.from({ length: 8 }, (_, i) => currentYear - 3 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {/* Month selector */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-9 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          {/* 4 KPI tiles in a responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {monthlyKpiTiles.map((kpi, i) => (
              <KPICard key={i} {...kpi} />
            ))}
            {/* Show placeholder tiles when data is loading */}
            {!analytics && !loading && (
              <div className="col-span-4 text-center text-sm text-slate-400 py-8">
                Select a company to view analytics
              </div>
            )}
            {loading && !analytics && (
              <div className="col-span-4 text-center text-sm text-slate-400 py-8">
                Loading analytics...
              </div>
            )}
          </div>
        </div>
        {/* ================================================================
            SECTION 2: YEARLY PERFORMANCE (YTD)
            4 tiles showing YTD GP Margin, YTD GP, YTD PBT Before,
            PBT Achievement YTD
            YTD is calculated based on FY start month → selected month
            using the same year/month selected above
        ================================================================ */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Yearly Performance (YTD)
            </h3>
            <span className="text-xs text-slate-400">
              Based on selected year &amp; month above
            </span>
          </div>
          {/* 4 YTD KPI tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {yearlyKpiTiles.map((kpi, i) => (
              <KPICard key={i} {...kpi} />
            ))}
          </div>
        </div>
        {/* ================================================================
            SECTION 3 & 4: CHARTS ROW 1
            Left: PBT Before vs After comparison (bar chart)
            Right: PBT Before monthly trend (line chart)
        ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* ------ 3. Actual PBT Comparison (Before vs After) ------ */}
          <ChartCard
            title="Actual PBT Comparison (Before vs After)"
            description="Comparison of Profit Before Tax (PBT) before and after adjustments"
          >
            {/* Toggle between Monthly / Yearly view */}
            <div className="flex justify-end mb-4">
              <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium">
                <button
                  onClick={() => setPbtViewMode("monthly")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    pbtViewMode === "monthly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Monthly View
                </button>
                <button
                  onClick={() => setPbtViewMode("yearly")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    pbtViewMode === "yearly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Yearly View
                </button>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {/* Bar chart: PBT Before (dark) and PBT After (blue) side by side */}
                <BarChart
                  data={pbtViewMode === "monthly" ? pbtCompMonthly : pbtCompYearly}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={formatCurrency} />
                  <Tooltip
                    formatter={(value: number) => [`LKR ${formatCurrency(value)}`, ""]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  {/* PBT Before bars - dark navy */}
                  <Bar dataKey="pbt_before" name="PBT Before" fill="#0b1f3a" radius={[4, 4, 0, 0]} />
                  {/* PBT After bars - blue */}
                  <Bar dataKey="pbt_after" name="PBT After" fill="#0341a5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          {/* ------ 4. PBT Before - Monthly Trend ------ */}
          <ChartCard
            title="PBT Before - Monthly Trend"
            description="Monthly trend of Profit Before Tax (Pre-adjustment) - detect seasonality and turning points"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {/* Line chart: single series showing PBT Before over 12 months */}
                <LineChart
                  data={pbtTrend}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={formatCurrency} />
                  <Tooltip
                    formatter={(value: number) => [`LKR ${formatCurrency(value)}`, "PBT Before"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  {/* Single trend line in dark navy */}
                  <Line
                    type="linear"
                    dataKey="pbt_before"
                    name="PBT Before"
                    stroke="#0b1f3a"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
        {/* ================================================================
            SECTION 5 & 6: CHARTS ROW 2
            Left (2/3): Profitability Margins line chart
            Right (1/3): Expense Breakdown pie chart
        ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* ------ 5. Profitability Margins ------ */}
          <div className="lg:col-span-2">
            <ChartCard
              title="Profitability Margins"
              description="GP Margin and Net Profit Margin (PBT Before / Revenue) trends"
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {/* Dual-line chart: GP Margin + NP Margin over 12 months */}
                  <LineChart
                    data={profitabilityData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" unit="%" />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Legend />
                    {/* GP Margin line - dark navy colour */}
                    <Line
                      type="monotone"
                      dataKey="gp_margin"
                      name="GP Margin"
                      stroke="#0b1f3a"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    {/* Net Profit Margin line - blue colour */}
                    <Line
                      type="monotone"
                      dataKey="np_margin"
                      name="NP Margin"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
          {/* ------ 6. Expense Breakdown Pie Chart ------ */}
          <ChartCard
            title="Expense Breakdown"
            description="Distribution of operating expenses for the selected month"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {/* Donut chart showing expense category proportions */}
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="percentage"
                  >
                    {/* Each slice gets its colour from the API response */}
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name: string, props: any) => {
                      // Show both percentage and actual amount in tooltip
                      const item = props.payload;
                      return [
                        `${value.toFixed(1)}% (LKR ${formatCurrency(item.value)})`,
                        item.name,
                      ];
                    }}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend below the pie chart showing category names + colours */}
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {expenseBreakdown.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {/* Colour dot matching the pie slice */}
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {/* Category name and percentage */}
                    <span className="text-xs text-slate-600">
                      {item.name} ({item.percentage.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>
        {/* ================================================================
            SECTION 7: PERFORMANCE CARD
            6-column layout: Monthly (Actual PBT, Budget PBT, Achievement)
            + Yearly/YTD (Actual PBT, Budget PBT, Achievement)
            Values calculated from database in real-time
        ================================================================ */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6">
            <h3 className="text-base font-semibold text-slate-900 border-l-4 border-[#0b1f3a] pl-3 mb-6">
              Performance Summary
            </h3>
            {analytics ? (
              <>
                {/* Sub-headers */}
                <div className="grid grid-cols-6 gap-4 mb-2">
                  <div className="col-span-3">
                    <p className="text-xs font-bold text-[#0b1f3a] uppercase tracking-wider">Monthly</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-xs font-bold text-[#0b1f3a] uppercase tracking-wider">Yearly (YTD)</p>
                  </div>
                </div>
                {/* 6 columns: Monthly (3) + Yearly (3) */}
                <div className="grid grid-cols-6 gap-4">
                  {/* Monthly Actual PBT */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actual PBT
                    </p>
                    <p className="text-lg font-bold text-slate-900 font-mono">
                      LKR {analytics.performance_monthly?.actual_pbt !== null
                        ? formatCurrency(analytics.performance_monthly.actual_pbt)
                        : "\u2014"}
                    </p>
                  </div>
                  {/* Monthly Budget PBT */}
                  <div className="space-y-1 border-l border-slate-100 pl-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Budget PBT
                    </p>
                    <p className="text-lg font-bold text-slate-900 font-mono">
                      LKR {analytics.performance_monthly?.budget_pbt !== null
                        ? formatCurrency(analytics.performance_monthly.budget_pbt)
                        : "\u2014"}
                    </p>
                  </div>
                  {/* Monthly Achievement */}
                  <div className="space-y-1 border-l border-slate-100 pl-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Achievement
                    </p>
                    {(() => {
                      const ach = analytics.performance_monthly?.budget_pbt
                        ? calculateAchievement(analytics.performance_monthly.actual_pbt, analytics.performance_monthly.budget_pbt)
                        : null;
                      return (
                        <div className={`flex items-baseline gap-1.5 ${ach !== null && ach >= 100 ? "text-emerald-600" : "text-red-600"}`}>
                          <span className="text-lg font-bold">
                            {ach !== null ? `${ach.toFixed(1)}%` : "\u2014"}
                          </span>
                          {ach !== null && ach >= 100 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : ach !== null ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>
                  {/* Yearly Actual PBT */}
                  <div className="space-y-1 border-l-2 border-slate-200 pl-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actual PBT
                    </p>
                    <p className="text-lg font-bold text-slate-900 font-mono">
                      LKR {analytics.performance_yearly?.actual_pbt !== null
                        ? formatCurrency(analytics.performance_yearly.actual_pbt)
                        : "\u2014"}
                    </p>
                  </div>
                  {/* Yearly Budget PBT */}
                  <div className="space-y-1 border-l border-slate-100 pl-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Budget PBT
                    </p>
                    <p className="text-lg font-bold text-slate-900 font-mono">
                      LKR {analytics.performance_yearly?.budget_pbt !== null
                        ? formatCurrency(analytics.performance_yearly.budget_pbt)
                        : "\u2014"}
                    </p>
                  </div>
                  {/* Yearly Achievement */}
                  <div className="space-y-1 border-l border-slate-100 pl-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Achievement
                    </p>
                    {(() => {
                      const ach = analytics.performance_yearly?.budget_pbt
                        ? calculateAchievement(analytics.performance_yearly.actual_pbt, analytics.performance_yearly.budget_pbt)
                        : null;
                      return (
                        <div className={`flex items-baseline gap-1.5 ${ach !== null && ach >= 100 ? "text-emerald-600" : "text-red-600"}`}>
                          <span className="text-lg font-bold">
                            {ach !== null ? `${ach.toFixed(1)}%` : "\u2014"}
                          </span>
                          {ach !== null && ach >= 100 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : ach !== null ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-sm text-slate-400 py-4">
                {loading ? "Loading..." : "No performance data available"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}