"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, XCircle, Edit3, RefreshCw, Calendar, Building2 } from "lucide-react";
import { FOAPI } from "@/lib/api-client";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface RejectedItem {
  company_id: string;
  company_name: string;
  cluster_name: string;
  period_id: number;
  year: number;
  month: number;
  status: string;
  reject_reason: string | null;
  rejected_by: string | null;
  rejected_date: string | null;
  actual_comment: string | null;
  metrics: Record<string, number | null>;
}

function getDaysAgo(isoString: string): number {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ==================== REPORT CARD COMPONENT ====================
function RejectedReportCard({ report }: { report: RejectedItem }) {
  const router = useRouter();
  const daysAgo = report.rejected_date ? getDaysAgo(report.rejected_date) : 0;
  const isOverdue = daysAgo > 7;

  const handleReviewEdit = () => {
    sessionStorage.setItem("editingRejectedReport", JSON.stringify({
      reportId: `${report.company_id}-${report.year}-${report.month}`,
      companyName: report.company_name,
      cluster: report.cluster_name,
      period: `${MONTHS[report.month]} ${report.year}`,
      formData: {
        revenue: String(report.metrics.revenue ?? ""),
        gp: String(report.metrics.gp ?? ""),
        otherIncome: String(report.metrics.other_income ?? ""),
        personalExpenses: String(report.metrics.personal_exp ?? ""),
        adminExpenses: String(report.metrics.admin_exp ?? ""),
        sellingExpenses: String(report.metrics.selling_exp ?? ""),
        financialExpenses: String(report.metrics.finance_exp ?? ""),
        depreciation: String(report.metrics.depreciation ?? ""),
        provisions: String(report.metrics.provisions ?? ""),
        exchange: String(report.metrics.exchange_variance ?? ""),
        nonOpsExpenses: String(report.metrics.non_ops_exp ?? ""),
        nonOpsIncome: String(report.metrics.non_ops_income ?? ""),
      },
      rejectionReason: report.reject_reason,
    }));
    router.push("/finance-officer/dashboard");
  };

  return (
    <div className="bg-white border border-red-100 rounded-xl overflow-hidden">
      {/* Header with Status Badges */}
      <div className="bg-red-50 border-b border-red-100 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold uppercase tracking-wide">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </span>
          {isOverdue && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold border border-orange-200">
              Overdue ({daysAgo} days)
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Report Identity */}
        <div className="mb-5">
          <h3 className="text-xl font-bold text-slate-900 mb-1">{report.company_name}</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {report.cluster_name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {MONTHS[report.month]} {report.year}
            </span>
          </div>
        </div>

        {/* Rejection Metadata */}
        {report.rejected_by && (
          <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Rejected by:</span> {report.rejected_by}
              </p>
              {report.rejected_date && (
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">{formatDateTime(report.rejected_date)}</p>
                  <p className="text-xs text-slate-500">{daysAgo} {daysAgo === 1 ? "day" : "days"} ago</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rejection Reason - Highlighted */}
        {report.reject_reason && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-900 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-800 leading-relaxed">{report.reject_reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleReviewEdit}
          className="inline-flex items-center gap-2 h-11 px-6 bg-[#0b1f3a] text-white text-sm font-semibold rounded-lg hover:bg-[#0b1f3a]/90 transition-all shadow-sm hover:shadow-md"
        >
          <Edit3 className="h-4 w-4" />
          Review & Submit
        </button>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE COMPONENT ====================
export default function RejectedReportsPage() {
  const [reports, setReports] = useState<RejectedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    const res = await FOAPI.getRejectedActuals();
    setLoading(false);
    if (res.data) {
      setReports(res.data.reports);
    } else {
      setError(res.error || "Failed to load rejected reports");
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const totalCount = reports.length;
  const overdueCount = reports.filter((r) => r.rejected_date && getDaysAgo(r.rejected_date) > 7).length;

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-5">
          <h1 className="text-2xl font-bold text-slate-900">Rejected Reports</h1>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-[#0b1f3a] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rejected Reports</h1>
            <p className="text-sm text-slate-600 mt-1">
              Review and correct reports that require revisions
            </p>
          </div>
          <div className="flex items-center gap-4">
            {totalCount > 0 && (
              <div className="flex gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{totalCount}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Total</div>
                </div>
                {overdueCount > 0 && (
                  <>
                    <div className="w-px bg-slate-200" />
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">{overdueCount}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wide">Overdue</div>
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              onClick={loadReports}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#0b1f3a] hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <span className="font-semibold">Action Required:</span> Please review and correct the rejected reports below. Reports pending for more than 7 days are marked as overdue.
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="max-w-5xl mx-auto mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {totalCount === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">All Clear!</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              You have no rejected reports. All submissions are up to date and have been approved or are pending review.
            </p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-4">
            {reports.map((report) => (
              <RejectedReportCard
                key={`${report.company_id}-${report.period_id}`}
                report={report}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
