"use client";

import { useMemo, useState, useEffect } from "react";
import { Building2, TrendingUp, TrendingDown, Clock, CheckCircle, Send, BarChart3, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useFDDashboard, usePendingReports, useMyCompanies } from "@/hooks/use-api";

function StatCard({ title, value, change, positive, icon: Icon }: {
  title: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 ${positive ? "text-emerald-600" : "text-red-600"}`}>
              {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm font-medium">{change}</span>
              <span className="text-xs text-slate-400 ml-1">vs prior</span>
            </div>
          )}
        </div>
        <div className="h-11 w-11 rounded-lg bg-[#0b1f3a]/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[#0b1f3a]" />
        </div>
      </div>
    </div>
  );
}

export default function FinanceDirectorDashboard() {
  const pendingState = usePendingReports();
  const dashboardState = useFDDashboard();
  const companiesState = useMyCompanies();

  const companies = companiesState.data || [];
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedReportId, setSelectedReportId] = useState<string>("");

  useEffect(() => {
    if (!companies.length) return;
    const saved = localStorage.getItem("fd_selected_company");
    const valid = companies.find((c) => c.id === saved)?.id || companies[0].id;
    setSelectedCompanyId(valid);
  }, [companies]);

  useEffect(() => {
    if (selectedCompanyId) {
      localStorage.setItem("fd_selected_company", selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || companies[0] || null,
    [companies, selectedCompanyId]
  );

  const reports = pendingState.data?.reports || [];
  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0] || null;
  const stats = dashboardState.data;

  const kpi = useMemo(() => {
    if (!stats) {
      return {
        ytdGPMargin: "0.0%",
        ytdGP: "0",
        ytdPBTBefore: "0",
        pbtAchievement: "0.0%",
      };
    }
    const submittedPct = stats.total_companies
      ? (stats.companies_submitted / stats.total_companies) * 100
      : 0;
    return {
      ytdGPMargin: `${submittedPct.toFixed(1)}%`,
      ytdGP: stats.approved_this_month.toLocaleString(),
      ytdPBTBefore: stats.pending_review.toLocaleString(),
      pbtAchievement: `${submittedPct.toFixed(1)}%`,
    };
  }, [stats]);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#0b1f3a]/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-[#0b1f3a]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{selectedCompany?.name || "Assigned Company"}</h2>
              <p className="text-sm text-slate-500">Finance Director Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {companies.length > 1 && (
              <div className="relative">
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="h-10 pl-3 pr-8 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 appearance-none cursor-pointer min-w-[220px]"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            )}
            {(pendingState.loading || dashboardState.loading || companiesState.loading) && (
              <div className="h-5 w-5 border-2 border-[#0b1f3a] border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Company Performance (YTD)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Submitted Companies" value={kpi.ytdGPMargin} icon={BarChart3} />
            <StatCard title="Approved This Month" value={kpi.ytdGP} icon={TrendingUp} />
            <StatCard title="Pending Review" value={kpi.ytdPBTBefore} icon={BarChart3} />
            <StatCard title="Submission Achievement" value={kpi.pbtAchievement} icon={Clock} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Reports from Finance Officer</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Review submissions and submit to MD</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  {reports.length} pending
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {reports.map((report) => {
                  const variancePositive = (report as any).variance >= 0;
                  const varianceLabel = (report as any).variance !== undefined
                    ? `${variancePositive ? "+" : ""}${Number((report as any).variance).toFixed(1)}`
                    : "-";
                  return (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className={`w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors ${
                        selectedReport?.id === report.id ? "bg-slate-50 border-l-2 border-l-[#0b1f3a]" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{report.month_name} {report.year}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Pending Review
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Submitted by {report.submitted_by_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${variancePositive ? "text-emerald-600" : "text-red-600"}`}>
                            {varianceLabel}
                          </p>
                          <p className="text-xs text-slate-400">{report.days_pending} day(s)</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {!pendingState.loading && reports.length === 0 && (
                  <div className="p-5 text-sm text-slate-500">No pending reports.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center min-h-[180px]">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Company Rank</h3>
              <p className="text-4xl font-bold text-slate-900 mt-2 mb-1">#{stats?.companies_submitted || 0}</p>
              <p className="text-xs text-slate-400 font-medium whitespace-nowrap mt-1">
                Based on submission and approval status
              </p>
            </div>

            {selectedReport && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">
                  Selected: {selectedReport.month_name} {selectedReport.year}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Company</span>
                    <span className="font-medium text-slate-900">{selectedReport.company_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Submitted By</span>
                    <span className="font-medium text-slate-900">{selectedReport.submitted_by_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Days Pending</span>
                    <span className="font-semibold text-amber-600">{selectedReport.days_pending}</span>
                  </div>
                  <hr className="my-3" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="h-4 w-4" /> Submitted
                    </span>
                  </div>
                  <div className="pt-3 space-y-2">
                    <Link
                      href="/finance-director/reports"
                      className="flex items-center justify-center gap-2 w-full h-10 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      Review & Submit to MD
                    </Link>
                    <button
                      type="button"
                      className="w-full h-10 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      Send Back for Correction
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

