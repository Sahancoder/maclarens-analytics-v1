"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Send, X, ChevronDown, AlertCircle, Mail } from "lucide-react";

const reportData = [
  { metric: "Revenue (LKR)", actual: "12,500,000", budget: "12,000,000", variance: "500,000", pct: "+4.17%" },
  { metric: "Gross Profit (GP)", actual: "4,375,000", budget: "4,200,000", variance: "175,000", pct: "+4.17%" },
  { metric: "GP Margin", actual: "35.00%", budget: "35.00%", variance: "0.00%", pct: "0.00%", isCalc: true },
  { metric: "Other Income", actual: "250,000", budget: "200,000", variance: "50,000", pct: "+25.00%" },
  { metric: "Personal Related Expenses", actual: "1,500,000", budget: "1,600,000", variance: "-100,000", pct: "-6.25%" },
  { metric: "Admin & Establishment", actual: "800,000", budget: "850,000", variance: "-50,000", pct: "-5.88%" },
  { metric: "Selling & Distribution", actual: "600,000", budget: "650,000", variance: "-50,000", pct: "-7.69%" },
  { metric: "Financial Expenses", actual: "200,000", budget: "180,000", variance: "20,000", pct: "+11.11%" },
  { metric: "Depreciation", actual: "300,000", budget: "300,000", variance: "0", pct: "0.00%" },
  { metric: "Total Overheads", actual: "3,400,000", budget: "3,580,000", variance: "-180,000", pct: "-5.03%", isCalc: true },
  { metric: "Provisions", actual: "50,000", budget: "75,000", variance: "-25,000", pct: "-33.33%" },
  { metric: "Exchange (Loss/Gain)", actual: "-30,000", budget: "-20,000", variance: "-10,000", pct: "+50.00%" },
  { metric: "PBT Before Non-Ops", actual: "1,145,000", budget: "725,000", variance: "420,000", pct: "+57.93%", isCalc: true },
  { metric: "NP Margin", actual: "9.16%", budget: "6.04%", variance: "3.12%", pct: "+51.66%", isCalc: true },
  { metric: "Non-Operating Expenses", actual: "100,000", budget: "120,000", variance: "-20,000", pct: "-16.67%" },
  { metric: "Non-Operating Income", actual: "80,000", budget: "60,000", variance: "20,000", pct: "+33.33%" },
  { metric: "PBT After Non-Ops", actual: "1,125,000", budget: "665,000", variance: "460,000", pct: "+69.17%", isCalc: true },
  { metric: "EBIT", actual: "1,325,000", budget: "845,000", variance: "480,000", pct: "+56.80%", isCalc: true },
  { metric: "EBITDA", actual: "1,625,000", budget: "1,145,000", variance: "480,000", pct: "+41.92%", isCalc: true },
];

const pendingReports = [
  { id: 1, company: "McLarens Maritime Academy", month: "December 2025", submittedBy: "Sahan Hettiarachchi", submittedAt: "Dec 20, 2025" },
  { id: 2, company: "GAC Shipping Limited", month: "December 2025", submittedBy: "Natali Craig", submittedAt: "Dec 19, 2025" },
  { id: 3, company: "Spectra Logistics", month: "November 2025", submittedBy: "Drew Cano", submittedAt: "Dec 18, 2025" },
];

export default function ReportsPage() {
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState(pendingReports[0]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const handleSubmitToMD = () => {
    setShowApproveConfirm(false);
    // In real app: API call to submit report to MD dashboard
    alert(`Report for ${selectedReport.company} - ${selectedReport.month} has been submitted to MD Dashboard.`);
    router.push("/finance-director/dashboard");
  };

  const handleSendBack = () => {
    if (!rejectComment.trim()) return;
    
    // In real app: API call to send report back for correction
    // This would send email notification to Finance Officer
    alert(`Report sent back for correction. Email sent to ${selectedReport.submittedBy}: "${rejectComment}"`);
    setShowRejectModal(false);
    setRejectComment("");
    router.push("/finance-director/dashboard");
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Review Report</h1>
            <p className="text-sm text-slate-500 mt-1">Review reports from Finance Officer and submit to MD</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              <Download className="h-4 w-4" /> Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Pending Reports List */}
        <div className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col h-64 md:h-auto border-b md:border-b-0">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800">Pending Approval</h3>
            <p className="text-xs text-slate-500 mt-1">{pendingReports.length} reports waiting</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pendingReports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`w-full p-4 text-left border-b border-slate-100 transition-colors ${
                  selectedReport.id === report.id ? "bg-[#0b1f3a]/5 border-l-2 border-l-[#0b1f3a]" : "hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-medium text-slate-900">{report.company}</p>
                <p className="text-xs text-slate-500 mt-1">{report.month}</p>
                <p className="text-xs text-slate-400 mt-1">By {report.submittedBy}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Report Details */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Report Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedReport.company}</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedReport.month} - Financial Year 2025-26</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Submitted by</p>
                <p className="text-sm font-medium text-slate-900">{selectedReport.submittedBy}</p>
                <p className="text-xs text-slate-400 mt-1">{selectedReport.submittedAt}</p>
              </div>
            </div>
          </div>

          {/* Actual vs Budget Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Metric</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actual</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Budget</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Variance</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Variance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.map((row, i) => {
                    const isPositive = row.pct.startsWith("+") || row.pct === "0.00%";
                    return (
                      <tr key={i} className={row.isCalc ? "bg-slate-50" : "hover:bg-slate-50"}>
                        <td className={`px-5 py-3 text-sm ${row.isCalc ? "font-semibold text-slate-800" : "text-slate-700"}`}>
                          {row.metric}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{row.actual}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{row.budget}</td>
                        <td className={`px-5 py-3 text-sm text-right font-mono ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                          {row.variance}
                        </td>
                        <td className={`px-5 py-3 text-sm text-right font-mono font-medium ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                          {row.pct}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex items-center gap-2 h-11 px-6 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <Mail className="h-4 w-4" /> Send Back for Correction
            </button>
            <button
              onClick={() => setShowApproveConfirm(true)}
              className="flex items-center gap-2 h-11 px-6 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Send className="h-4 w-4" /> Submit to MD
            </button>
          </div>
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Submit to MD Dashboard</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              You are about to submit the report for <span className="font-semibold">{selectedReport.company}</span> - {selectedReport.month} to the MD Dashboard. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="h-10 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitToMD}
                className="h-10 px-5 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600"
              >
                Yes, Submit to MD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal with Comment */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Send Back for Correction</h3>
                <p className="text-sm text-slate-500">Please provide details of what needs to be corrected</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                This comment will be sent to <span className="font-semibold">{selectedReport.submittedBy}</span> via email and will appear in their notifications.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Correction Details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Please describe what needs to be corrected in the report..."
                rows={4}
                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <p className="text-xs text-slate-400 mt-2">
                This message will be visible in the Comments section for both parties.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowRejectModal(false); setRejectComment(""); }}
                className="h-10 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBack}
                disabled={!rejectComment.trim()}
                className="h-10 px-5 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Back & Email Finance Officer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
