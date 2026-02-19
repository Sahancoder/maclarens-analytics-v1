"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, AlertCircle, RefreshCw, CheckCircle2, Building2, Calendar, User, Pencil, Save, X, MessageSquare } from "lucide-react";
import { FDAPI } from "@/lib/api-client";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const METRIC_LABELS: Record<string, string> = {
  revenue: "Revenue (LKR)",
  gp: "Gross Profit (GP)",
  gp_margin: "GP Margin",
  other_income: "Other Income",
  personal_exp: "Personal Related Expenses",
  admin_exp: "Admin & Establishment",
  selling_exp: "Selling & Distribution",
  finance_exp: "Financial Expenses",
  depreciation: "Depreciation",
  total_overheads: "Total Overheads",
  provisions: "Provisions",
  exchange_variance: "Exchange (Loss/Gain)",
  pbt_before_non_ops: "PBT Before Non-Ops",
  np_margin: "NP Margin",
  non_ops_exp: "Non-Operating Expenses",
  non_ops_income: "Non-Operating Income",
  pbt_after_non_ops: "PBT After Non-Ops",
  ebit: "EBIT",
  ebitda: "EBITDA",
};

const METRIC_ORDER = [
  "revenue", "gp", "gp_margin", "other_income",
  "personal_exp", "admin_exp", "selling_exp", "finance_exp", "depreciation",
  "total_overheads", "provisions", "exchange_variance",
  "pbt_before_non_ops", "np_margin",
  "non_ops_exp", "non_ops_income",
  "pbt_after_non_ops", "ebit", "ebitda",
];

const CALCULATED_METRICS = new Set([
  "gp_margin", "total_overheads", "pbt_before_non_ops", "np_margin",
  "pbt_after_non_ops", "ebit", "ebitda",
]);

interface SubmittedReport {
  company_id: string;
  company_name: string;
  cluster_name: string;
  period_id: number;
  year: number;
  month: number;
  status: string;
  actual_comment: string | null;
  budget_comment: string | null;
  submitted_by: string | null;
  submitted_date: string | null;
  actual_metrics: Record<string, number | null>;
  budget_metrics: Record<string, number | null>;
  ytd_actual_metrics: Record<string, number | null>;
  ytd_budget_metrics: Record<string, number | null>;
  fin_year_start_month: number | null;
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return "\u2014";
  return v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function achievement(actual: number | null | undefined, budget: number | null | undefined): string {
  if (actual == null || budget == null || budget === 0) return "\u2014";
  return ((actual / budget) * 100).toFixed(1) + "%";
}

function achvColor(actual: number | null | undefined, budget: number | null | undefined): string {
  if (actual == null || budget == null || budget === 0) return "text-slate-400";
  const pct = (actual / budget) * 100;
  return pct >= 100 ? "text-emerald-600" : "text-amber-600";
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<SubmittedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<SubmittedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Editable comments state
  const [editingActual, setEditingActual] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [editActualComment, setEditActualComment] = useState("");
  const [editBudgetComment, setEditBudgetComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    const res = await FDAPI.getSubmittedActuals();
    setLoading(false);
    if (res.data) {
      setReports(res.data.reports);
      if (res.data.reports.length > 0) {
        setSelectedReport(res.data.reports[0]);
      } else {
        setSelectedReport(null);
      }
    } else {
      setError(res.error || "Failed to load reports");
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Reset editing state when selected report changes
  useEffect(() => {
    setEditingActual(false);
    setEditingBudget(false);
    setEditActualComment("");
    setEditBudgetComment("");
  }, [selectedReport?.company_id, selectedReport?.period_id]);

  const handleApprove = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    const res = await FDAPI.approveActual(selectedReport.company_id, selectedReport.period_id);
    setActionLoading(false);
    if (res.data) {
      setShowApproveConfirm(false);
      const updated = reports.filter(
        (r) => !(r.company_id === selectedReport.company_id && r.period_id === selectedReport.period_id)
      );
      setReports(updated);
      setSelectedReport(updated.length > 0 ? updated[0] : null);
    } else {
      alert(res.error || "Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!selectedReport || !rejectComment.trim()) return;
    setActionLoading(true);
    const res = await FDAPI.rejectActual(selectedReport.company_id, selectedReport.period_id, rejectComment);
    setActionLoading(false);
    if (res.data) {
      setShowRejectModal(false);
      setRejectComment("");
      const updated = reports.filter(
        (r) => !(r.company_id === selectedReport.company_id && r.period_id === selectedReport.period_id)
      );
      setReports(updated);
      setSelectedReport(updated.length > 0 ? updated[0] : null);
    } else {
      alert(res.error || "Failed to reject");
    }
  };

  const startEditActual = () => {
    if (!selectedReport) return;
    setEditActualComment(selectedReport.actual_comment || "");
    setEditingActual(true);
  };

  const cancelEditActual = () => {
    setEditingActual(false);
    setEditActualComment("");
  };

  const startEditBudget = () => {
    if (!selectedReport) return;
    setEditBudgetComment(selectedReport.budget_comment || "");
    setEditingBudget(true);
  };

  const cancelEditBudget = () => {
    setEditingBudget(false);
    setEditBudgetComment("");
  };

  const saveActualComment = async () => {
    if (!selectedReport) return;
    setCommentSaving(true);
    // Only update actual comment
    const res = await FDAPI.updateComments(
      selectedReport.company_id,
      selectedReport.period_id,
      editActualComment,
      undefined
    );
    setCommentSaving(false);
    if (res.data) {
      const updatedReport = {
        ...selectedReport,
        actual_comment: editActualComment || null,
      };
      setSelectedReport(updatedReport);
      setReports((prev) =>
        prev.map((r) =>
          r.company_id === selectedReport.company_id && r.period_id === selectedReport.period_id
            ? updatedReport
            : r
        )
      );
      setEditingActual(false);
    } else {
      alert(res.error || "Failed to save comment");
    }
  };

  const saveBudgetComment = async () => {
    if (!selectedReport) return;
    setCommentSaving(true);
    // Only update budget comment
    const res = await FDAPI.updateComments(
      selectedReport.company_id,
      selectedReport.period_id,
      undefined,
      editBudgetComment
    );
    setCommentSaving(false);
    if (res.data) {
      const updatedReport = {
        ...selectedReport,
        budget_comment: editBudgetComment || null,
      };
      setSelectedReport(updatedReport);
      setReports((prev) =>
        prev.map((r) =>
          r.company_id === selectedReport.company_id && r.period_id === selectedReport.period_id
            ? updatedReport
            : r
        )
      );
      setEditingBudget(false);
    } else {
      alert(res.error || "Failed to save comment");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-5">
          <h1 className="text-xl font-semibold text-slate-900">Review Reports</h1>
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
            <h1 className="text-xl font-semibold text-slate-900">Review Reports</h1>
            <p className="text-sm text-slate-500 mt-1">Review submitted actuals from Finance Officers</p>
          </div>
          <button
            onClick={loadReports}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#0b1f3a] hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">All Clear</h3>
            <p className="text-sm text-slate-600">No pending reports to review.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Pending Reports List */}
          <div className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col h-64 md:h-auto border-b md:border-b-0">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Pending Approval</h3>
              <p className="text-xs text-slate-500 mt-1">{reports.length} reports waiting</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {reports.map((report) => (
                <button
                  key={`${report.company_id}-${report.period_id}`}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full p-4 text-left border-b border-slate-100 transition-colors ${
                    selectedReport?.company_id === report.company_id && selectedReport?.period_id === report.period_id
                      ? "bg-[#0b1f3a]/5 border-l-2 border-l-[#0b1f3a]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-900">{report.company_name}</p>
                  <p className="text-xs text-slate-500 mt-1">{MONTHS[report.month]} {report.year}</p>
                  {report.submitted_by && (
                    <p className="text-xs text-slate-400 mt-1">By {report.submitted_by}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Report Details */}
          {selectedReport && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {/* Report Info */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{selectedReport.company_name}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {selectedReport.cluster_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {MONTHS[selectedReport.month]} {selectedReport.year}
                      </span>
                      {selectedReport.fin_year_start_month && (
                        <span className="text-xs text-slate-400">
                          FY starts {MONTHS[selectedReport.fin_year_start_month]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {selectedReport.submitted_by && (
                      <>
                        <p className="text-sm text-slate-500">Submitted by</p>
                        <p className="text-sm font-medium text-slate-900 flex items-center gap-1 justify-end">
                          <User className="h-3.5 w-3.5" />
                          {selectedReport.submitted_by}
                        </p>
                      </>
                    )}
                    {selectedReport.submitted_date && (
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(selectedReport.submitted_date).toLocaleString()}
                      </p>
                    )}
                </div>
              </div>
            </div>
              
              {/* Monthly + YTD Financial Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase w-52" rowSpan={2}>
                          Metric
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase border-l border-slate-200" colSpan={3}>
                          Monthly
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-[#0b1f3a] uppercase border-l-2 border-[#0b1f3a]/20 bg-[#0b1f3a]/5" colSpan={3}>
                          Year-to-Date (YTD)
                        </th>
                      </tr>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase border-l border-slate-200">Actual</th>
                        <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Budget</th>
                        <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Achv %</th>
                        <th className="px-4 py-2 text-right text-[10px] font-semibold text-[#0b1f3a] uppercase border-l-2 border-[#0b1f3a]/20 bg-[#0b1f3a]/5">Actual</th>
                        <th className="px-4 py-2 text-right text-[10px] font-semibold text-[#0b1f3a] uppercase bg-[#0b1f3a]/5">Budget</th>
                        <th className="px-4 py-2 text-right text-[10px] font-semibold text-[#0b1f3a] uppercase bg-[#0b1f3a]/5">Achv %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {METRIC_ORDER.map((key) => {
                        const actual = selectedReport.actual_metrics[key];
                        const budget = selectedReport.budget_metrics[key];
                        const ytdActual = selectedReport.ytd_actual_metrics?.[key];
                        const ytdBudget = selectedReport.ytd_budget_metrics?.[key];
                        const isCalc = CALCULATED_METRICS.has(key);
                        return (
                          <tr key={key} className={isCalc ? "bg-slate-50/70" : "hover:bg-slate-50/50"}>
                            <td className={`px-4 py-2.5 text-sm ${isCalc ? "font-semibold text-slate-800" : "text-slate-700"} whitespace-nowrap`}>
                              {METRIC_LABELS[key] || key}
                            </td>
                            {/* Monthly Actual */}
                            <td className="px-4 py-2.5 text-sm text-slate-700 text-right font-mono border-l border-slate-100">
                              {fmtNum(actual)}
                            </td>
                            {/* Monthly Budget */}
                            <td className="px-4 py-2.5 text-sm text-slate-700 text-right font-mono">
                              {fmtNum(budget)}
                            </td>
                            {/* Monthly Achievement */}
                            <td className={`px-4 py-2.5 text-sm text-right font-mono font-medium ${achvColor(actual, budget)}`}>
                              {achievement(actual, budget)}
                            </td>
                            {/* YTD Actual */}
                            <td className="px-4 py-2.5 text-sm text-slate-700 text-right font-mono border-l-2 border-[#0b1f3a]/10 bg-[#0b1f3a]/[0.02]">
                              {fmtNum(ytdActual)}
                            </td>
                            {/* YTD Budget */}
                            <td className="px-4 py-2.5 text-sm text-slate-700 text-right font-mono bg-[#0b1f3a]/[0.02]">
                              {fmtNum(ytdBudget)}
                            </td>
                            {/* YTD Achievement */}
                            <td className={`px-4 py-2.5 text-sm text-right font-mono font-medium bg-[#0b1f3a]/[0.02] ${achvColor(ytdActual, ytdBudget)}`}>
                              {achievement(ytdActual, ytdBudget)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>


              {/* Comments & Analysis */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Comments & Analysis</h3>
                    <p className="text-sm text-slate-500">Review and verify comments from Finance Officer</p>
                  </div>
                </div>

                <div className="relative pl-4 border-l border-slate-200 ml-5 space-y-8">
                  {/* Actual Comment */}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{selectedReport.submitted_by || "Finance Officer"}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                          Finance Officer
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {selectedReport.submitted_date ? new Date(selectedReport.submitted_date).toLocaleString() : ""}
                      </span>
                    </div>

                    {editingActual ? (
                      <div className="mt-2">
                         <textarea
                          value={editActualComment}
                          onChange={(e) => setEditActualComment(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Enter actual comment..."
                        />
                        <div className="flex gap-2 justify-end mt-2">
                          <button
                             onClick={cancelEditActual}
                             disabled={commentSaving}
                             className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                          >
                             <X className="h-3 w-3" /> Cancel
                          </button>
                          <button
                             onClick={saveActualComment}
                             disabled={commentSaving}
                             className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 disabled:opacity-50"
                          >
                             {commentSaving ? <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-3 w-3" />}
                             Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {selectedReport.actual_comment || "No comment provided."}
                        </p>
                        <button
                          onClick={startEditActual}
                          className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500 hover:text-[#0b1f3a] transition-colors"
                        >
                          <Pencil className="h-3 w-3" /> Edit / Correct Comment
                        </button>
                      </>
                    )}
                  </div>

                  {/* Budget Comment */}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-white" />
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">System</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide">
                          System
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {selectedReport.submitted_date ? new Date(selectedReport.submitted_date).toLocaleString() : ""}
                      </span>
                    </div>

                    {editingBudget ? (
                      <div className="mt-2">
                         <textarea
                          value={editBudgetComment}
                          onChange={(e) => setEditBudgetComment(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          placeholder="Enter budget comment..."
                        />
                        <div className="flex gap-2 justify-end mt-2">
                          <button
                             onClick={cancelEditBudget}
                             disabled={commentSaving}
                             className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                          >
                             <X className="h-3 w-3" /> Cancel
                          </button>
                          <button
                             onClick={saveBudgetComment}
                             disabled={commentSaving}
                             className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 disabled:opacity-50"
                          >
                             {commentSaving ? <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-3 w-3" />}
                             Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {selectedReport.budget_comment || "No budget comment provided."}
                        </p>
                        <button
                          onClick={startEditBudget}
                          className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500 hover:text-[#0b1f3a] transition-colors"
                        >
                          <Pencil className="h-3 w-3" /> Edit / Correct Comment
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex items-center gap-2 h-11 px-6 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <AlertCircle className="h-4 w-4" /> Send Back for Correction
                </button>
                <button
                  onClick={() => setShowApproveConfirm(true)}
                  className="flex items-center gap-2 h-11 px-6 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <Send className="h-4 w-4" /> Approve
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveConfirm && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Approve Report</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Approve the actual report for <span className="font-semibold">{selectedReport.company_name}</span> — {MONTHS[selectedReport.month]} {selectedReport.year}?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowApproveConfirm(false)}
                disabled={actionLoading}
                className="h-10 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="h-10 px-5 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Send Back for Correction</h3>
                <p className="text-sm text-slate-500">Provide details of what needs to be corrected</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                This will notify <span className="font-semibold">{selectedReport.submitted_by || "the Finance Officer"}</span>.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Correction Details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Describe what needs to be corrected..."
                rows={4}
                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowRejectModal(false); setRejectComment(""); }}
                disabled={actionLoading}
                className="h-10 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectComment.trim() || actionLoading}
                className="h-10 px-5 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                Send Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
