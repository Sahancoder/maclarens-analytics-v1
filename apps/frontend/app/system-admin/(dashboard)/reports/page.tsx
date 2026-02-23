"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import {
  AdminAPI,
  type AdminCluster,
  type AdminCompany,
  type ReportExportHistoryItem,
  type ReportMonthOption,
  type ReportPreviewData,
} from "@/lib/api-client";

const ALL_MONTH_OPTIONS: ReportMonthOption[] = [
  { month: 1, month_name: "January" },
  { month: 2, month_name: "February" },
  { month: 3, month_name: "March" },
  { month: 4, month_name: "April" },
  { month: 5, month_name: "May" },
  { month: 6, month_name: "June" },
  { month: 7, month_name: "July" },
  { month: 8, month_name: "August" },
  { month: 9, month_name: "September" },
  { month: 10, month_name: "October" },
  { month: 11, month_name: "November" },
  { month: 12, month_name: "December" },
];

function getFallbackYears(): number[] {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1, currentYear - 2];
}

function formatMonthLabel(month: number): string {
  const names = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return names[month] || String(month);
}

function formatMetricCell(value: number, isPercentage: boolean): string {
  if (isPercentage) {
    return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAchievementCell(value: number): string {
  if (!Number.isFinite(value)) return "0.00%";
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export default function AdminReportsPage() {
  const [clusters, setClusters] = useState<AdminCluster[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<ReportMonthOption[]>([]);

  const [selectedClusterId, setSelectedClusterId] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const [preview, setPreview] = useState<ReportPreviewData | null>(null);
  const [history, setHistory] = useState<ReportExportHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  const [loadingClusters, setLoadingClusters] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCluster = useMemo(
    () => clusters.find((cluster) => cluster.cluster_id === selectedClusterId) || null,
    [clusters, selectedClusterId]
  );
  const selectedCompany = useMemo(
    () => companies.find((company) => company.company_id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const canGenerate = Boolean(selectedClusterId && selectedCompanyId && selectedYear && selectedMonth);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await AdminAPI.getReportExportHistory(20, 0);

      if (response.error || !response.data) {
        setError(response.error || "Failed to load export history");
        return;
      }

      setHistory(response.data.items);
      setHistoryTotal(response.data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load export history");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      setLoadingClusters(true);
      const [clustersResponse] = await Promise.all([AdminAPI.getClustersList(), loadHistory()]);
      setLoadingClusters(false);

      if (clustersResponse.error || !clustersResponse.data) {
        setError(clustersResponse.error || "Failed to load clusters");
        return;
      }
      setClusters(clustersResponse.data.clusters.filter((c) => c.is_active));
    };

    loadInitial();
  }, [loadHistory]);

  useEffect(() => {
    if (!selectedClusterId) {
      setCompanies([]);
      return;
    }

    const loadCompanies = async () => {
      setLoadingCompanies(true);
      const response = await AdminAPI.getCompaniesList({
        page: 1,
        page_size: 500,
        cluster_id: selectedClusterId,
        is_active: true,
      });
      setLoadingCompanies(false);

      if (response.error || !response.data) {
        setError(response.error || "Failed to load companies");
        return;
      }
      setCompanies(response.data.companies);
    };

    loadCompanies();
  }, [selectedClusterId]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setYears([]);
      return;
    }

    const loadYears = async () => {
      setLoadingYears(true);
      const response = await AdminAPI.getReportYears(selectedCompanyId);
      setLoadingYears(false);

      if (response.error || !response.data) {
        setYears(getFallbackYears());
        setError(response.error || "Failed to load years with ACTUAL data. Showing fallback years.");
        return;
      }
      const loadedYears = response.data.years || [];
      setYears(loadedYears.length > 0 ? loadedYears : getFallbackYears());
    };

    loadYears();
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId || !selectedYear) {
      setMonths([]);
      return;
    }

    const loadMonths = async () => {
      setLoadingMonths(true);
      const response = await AdminAPI.getReportMonths(selectedCompanyId, Number(selectedYear));
      setLoadingMonths(false);

      if (response.error || !response.data) {
        setMonths(ALL_MONTH_OPTIONS);
        setError(response.error || "Failed to load months with ACTUAL data. Showing all months.");
        return;
      }
      const loadedMonths = response.data.months || [];
      setMonths(loadedMonths.length > 0 ? loadedMonths : ALL_MONTH_OPTIONS);
    };

    loadMonths();
  }, [selectedCompanyId, selectedYear]);

  const onClusterChange = (value: string) => {
    setSelectedClusterId(value);
    setSelectedCompanyId("");
    setSelectedYear("");
    setSelectedMonth("");
    setPreview(null);
    setSuccess(null);
    setError(null);
  };

  const onCompanyChange = (value: string) => {
    setSelectedCompanyId(value);
    setSelectedYear("");
    setSelectedMonth("");
    setPreview(null);
    setSuccess(null);
    setError(null);
  };

  const onYearChange = (value: string) => {
    setSelectedYear(value);
    setSelectedMonth("");
    setPreview(null);
    setSuccess(null);
    setError(null);
  };

  const onMonthChange = (value: string) => {
    setSelectedMonth(value);
    setPreview(null);
    setSuccess(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setLoadingPreview(true);
    setSuccess(null);
    setError(null);

    const response = await AdminAPI.getReportPreview({
      cluster_id: selectedClusterId,
      company_id: selectedCompanyId,
      year: Number(selectedYear),
      month: Number(selectedMonth),
    });
    setLoadingPreview(false);

    if (response.error || !response.data) {
      setError(response.error || "Failed to generate report preview");
      return;
    }

    setPreview(response.data);
  };

  const handleExportPdf = async () => {
    if (!canGenerate) return;

    setExportingPdf(true);
    setSuccess(null);
    setError(null);

    const response = await AdminAPI.exportReportPdf({
      cluster_id: selectedClusterId,
      company_id: selectedCompanyId,
      year: Number(selectedYear),
      month: Number(selectedMonth),
    });
    setExportingPdf(false);

    if (response.error || !response.data) {
      setError(response.error || "Failed to export PDF");
      return;
    }

    triggerDownload(response.data.blob, response.data.file_name);
    setSuccess("PDF exported successfully.");
    await loadHistory();
  };

  const handleExportExcel = async () => {
    if (!canGenerate) return;

    setExportingExcel(true);
    setSuccess(null);
    setError(null);

    const response = await AdminAPI.exportReportExcel({
      cluster_id: selectedClusterId,
      company_id: selectedCompanyId,
      year: Number(selectedYear),
      month: Number(selectedMonth),
    });
    setExportingExcel(false);

    if (response.error || !response.data) {
      setError(response.error || "Failed to export Excel");
      return;
    }

    triggerDownload(response.data.blob, response.data.file_name);
    setSuccess("Excel exported successfully.");
    await loadHistory();
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm md:text-base text-slate-500 mt-2">
            Build monthly and fiscal YTD reports, preview data, and export to PDF/Excel.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Report Builder</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cluster</label>
              <select
                value={selectedClusterId}
                onChange={(event) => onClusterChange(event.target.value)}
                disabled={loadingClusters}
                className="h-11 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#0b1f3a] disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Select Cluster</option>
                {clusters.map((cluster) => (
                  <option key={cluster.cluster_id} value={cluster.cluster_id}>
                    {cluster.cluster_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
              <select
                value={selectedCompanyId}
                onChange={(event) => onCompanyChange(event.target.value)}
                disabled={!selectedClusterId || loadingCompanies}
                className="h-11 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#0b1f3a] disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(event) => onYearChange(event.target.value)}
                disabled={!selectedCompanyId || loadingYears}
                className="h-11 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#0b1f3a] disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Select Year</option>
                {years.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(event) => onMonthChange(event.target.value)}
                disabled={!selectedYear || loadingMonths}
                className="h-11 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#0b1f3a] disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Select Month</option>
                {months.map((monthOption) => (
                  <option key={monthOption.month} value={String(monthOption.month)}>
                    {monthOption.month_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || loadingPreview}
                className="h-11 w-full rounded-lg bg-[#0b1f3a] text-white text-sm font-medium hover:bg-[#0b1f3a]/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingPreview ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Preview</h2>
              <p className="text-sm text-slate-500">
                {preview
                  ? `${preview.cluster_name} | ${preview.company_name} | ${preview.period_label}`
                  : "Generate a report to preview Month vs YTD Actual, Budget, and Achievement."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!preview || exportingPdf}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="h-4 w-4" />
                {exportingPdf ? "Exporting..." : "Export PDF"}
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!preview || exportingExcel}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {exportingExcel ? "Exporting..." : "Export Excel"}
              </button>
            </div>
          </div>

          {preview ? (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full min-w-[1180px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th
                      rowSpan={2}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200"
                    >
                      Matrix
                    </th>
                    <th
                      colSpan={3}
                      className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200"
                    >
                      {preview.matrix.month_label}
                    </th>
                    <th
                      colSpan={3}
                      className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200"
                    >
                      {preview.matrix.ytd_label}
                    </th>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actual</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Budget</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Achievement</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actual</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Budget</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Achievement</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    <tr key={row.metric_key} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.metric_label}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-800 font-medium">
                        {formatMetricCell(row.month_actual, row.is_percentage)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-800 font-medium">
                        {formatMetricCell(row.month_budget, row.is_percentage)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-800 font-medium">
                        {formatAchievementCell(row.month_achievement)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-800 font-medium">
                        {formatMetricCell(row.ytd_actual, row.is_percentage)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-800 font-medium">
                        {formatMetricCell(row.ytd_budget, row.is_percentage)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-800 font-medium">
                        {formatAchievementCell(row.ytd_achievement)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No preview data yet.</p>
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-4 leading-5">
            This document is issued by McLarens Group Management Pvt Limited and contains confidential financial
            information intended solely for authorized personnel. Any review, disclosure, copying, distribution, or use
            of this information by anyone other than the intended recipient is strictly prohibited. If you are not the
            authorized recipient, please delete this document immediately and notify the sender. Unauthorized sharing of
            this report may result in disciplinary or legal action. (c) McLarens Group Management Pvt Limited - Business
            Transformation
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Export History</h2>
              <p className="text-sm text-slate-500">{historyTotal} total exports tracked</p>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              disabled={loadingHistory}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No exports found yet.</p>
          ) : (
            <div className="max-h-[420px] overflow-auto border border-slate-200 rounded-lg">
              <table className="w-full min-w-[880px]">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">When</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Format</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Cluster</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">File</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {new Date(item.exported_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {item.exported_by_name || item.exported_by_email || item.exported_by}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.export_format}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.cluster_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.company_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatMonthLabel(item.month)} {item.year}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.file_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(selectedCluster || selectedCompany) && (
          <div className="text-xs text-slate-400">
            {selectedCluster ? `Cluster ID: ${selectedCluster.cluster_id}` : ""}{" "}
            {selectedCompany ? `Company ID: ${selectedCompany.company_id}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

