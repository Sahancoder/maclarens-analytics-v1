"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Send, X, ChevronDown, AlertCircle, Mail } from "lucide-react";

const reportData = [
  { metric: "Revenue (LKR)", monthlyActual: "12,500,000", monthlyBudget: "12,000,000", monthlyVariance: "500,000", monthlyAchievement: "104.17%", ytdActual: "145,000,000", ytdBudget: "140,000,000", ytdAchievement: "103.57%" },
  { metric: "Gross Profit (GP)", monthlyActual: "4,375,000", monthlyBudget: "4,200,000", monthlyVariance: "175,000", monthlyAchievement: "104.17%", ytdActual: "51,000,000", ytdBudget: "49,000,000", ytdAchievement: "104.08%" },
  { metric: "GP Margin", monthlyActual: "35.00%", monthlyBudget: "35.00%", monthlyVariance: "0.00%", monthlyAchievement: "100.00%", ytdActual: "35.17%", ytdBudget: "35.00%", ytdAchievement: "100.49%", isCalc: true },
  { metric: "Other Income", monthlyActual: "250,000", monthlyBudget: "200,000", monthlyVariance: "50,000", monthlyAchievement: "125.00%", ytdActual: "2,500,000", ytdBudget: "2,400,000", ytdAchievement: "104.17%" },
  { metric: "Personal Related Expenses", monthlyActual: "1,500,000", monthlyBudget: "1,600,000", monthlyVariance: "-100,000", monthlyAchievement: "93.75%", ytdActual: "17,500,000", ytdBudget: "18,000,000", ytdAchievement: "97.22%" },
  { metric: "Admin & Establishment", monthlyActual: "800,000", monthlyBudget: "850,000", monthlyVariance: "-50,000", monthlyAchievement: "94.12%", ytdActual: "9,000,000", ytdBudget: "9,500,000", ytdAchievement: "94.74%" },
  { metric: "Selling & Distribution", monthlyActual: "600,000", monthlyBudget: "650,000", monthlyVariance: "-50,000", monthlyAchievement: "92.31%", ytdActual: "7,000,000", ytdBudget: "7,500,000", ytdAchievement: "93.33%" },
  { metric: "Financial Expenses", monthlyActual: "200,000", monthlyBudget: "180,000", monthlyVariance: "20,000", monthlyAchievement: "111.11%", ytdActual: "2,200,000", ytdBudget: "2,000,000", ytdAchievement: "110.00%" },
  { metric: "Depreciation", monthlyActual: "300,000", monthlyBudget: "300,000", monthlyVariance: "0", monthlyAchievement: "100.00%", ytdActual: "3,600,000", ytdBudget: "3,600,000", ytdAchievement: "100.00%" },
  { metric: "Total Overheads", monthlyActual: "3,400,000", monthlyBudget: "3,580,000", monthlyVariance: "-180,000", monthlyAchievement: "94.97%", ytdActual: "39,300,000", ytdBudget: "40,600,000", ytdAchievement: "96.80%", isCalc: true },
  { metric: "Provisions", monthlyActual: "50,000", monthlyBudget: "75,000", monthlyVariance: "-25,000", monthlyAchievement: "66.67%", ytdActual: "600,000", ytdBudget: "800,000", ytdAchievement: "75.00%" },
  { metric: "Exchange (Loss/Gain)", monthlyActual: "-30,000", monthlyBudget: "-20,000", monthlyVariance: "-10,000", monthlyAchievement: "150.00%", ytdActual: "-350,000", ytdBudget: "-240,000", ytdAchievement: "145.83%" },
  { metric: "PBT Before Non-Ops", monthlyActual: "1,145,000", monthlyBudget: "725,000", monthlyVariance: "420,000", monthlyAchievement: "157.93%", ytdActual: "13,850,000", ytdBudget: "10,500,000", ytdAchievement: "131.90%", isCalc: true },
  { metric: "NP Margin", monthlyActual: "9.16%", monthlyBudget: "6.04%", monthlyVariance: "3.12%", monthlyAchievement: "151.66%", ytdActual: "9.55%", ytdBudget: "7.50%", ytdAchievement: "127.33%", isCalc: true },
  { metric: "Non-Operating Expenses", monthlyActual: "100,000", monthlyBudget: "120,000", monthlyVariance: "-20,000", monthlyAchievement: "83.33%", ytdActual: "1,100,000", ytdBudget: "1,300,000", ytdAchievement: "84.62%" },
  { metric: "Non-Operating Income", monthlyActual: "80,000", monthlyBudget: "60,000", monthlyVariance: "20,000", monthlyAchievement: "133.33%", ytdActual: "900,000", ytdBudget: "700,000", ytdAchievement: "128.57%" },
  { metric: "PBT After Non-Ops", monthlyActual: "1,125,000", monthlyBudget: "665,000", monthlyVariance: "460,000", monthlyAchievement: "169.17%", ytdActual: "13,650,000", ytdBudget: "9,900,000", ytdAchievement: "137.88%", isCalc: true },
  { metric: "EBIT", monthlyActual: "1,325,000", monthlyBudget: "845,000", monthlyVariance: "480,000", monthlyAchievement: "156.80%", ytdActual: "15,850,000", ytdBudget: "11,900,000", ytdAchievement: "133.19%", isCalc: true },
  { metric: "EBITDA", monthlyActual: "1,625,000", monthlyBudget: "1,145,000", monthlyVariance: "480,000", monthlyAchievement: "141.92%", ytdActual: "19,450,000", ytdBudget: "15,500,000", ytdAchievement: "125.48%", isCalc: true },
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
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-64">Metric</th>
                    
                    {/* Monthly Headers */}
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase border-l border-slate-100">Monthly Actual</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Monthly Budget</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Monthly Achv %</th>
                    
                    {/* YTD Headers */}
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase border-l border-slate-200 bg-slate-50/50">YTD Actual</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase bg-slate-50/50">YTD Budget</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase bg-slate-50/50">YTD Achv %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.map((row, i) => {
                    const isMonthlyPositive = parseFloat(row.monthlyAchievement.replace("%", "")) >= 100;
                    const isYtdPositive = parseFloat(row.ytdAchievement.replace("%", "")) >= 100;
                    
                    return (
                      <tr key={i} className={row.isCalc ? "bg-slate-50" : "hover:bg-slate-50"}>
                        <td className={`px-5 py-3 text-sm ${row.isCalc ? "font-semibold text-slate-800" : "text-slate-700"} whitespace-nowrap`}>
                          {row.metric}
                        </td>
                        
                        {/* Monthly Column Group */}
                        <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono border-l border-slate-100">{row.monthlyActual}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{row.monthlyBudget}</td>
                        <td className={`px-5 py-3 text-sm text-right font-mono font-medium ${isMonthlyPositive ? "text-emerald-600" : "text-amber-600"}`}>
                          {row.monthlyAchievement}
                        </td>

                        {/* YTD Column Group */}
                        <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono border-l border-slate-200 bg-slate-50/50">{row.ytdActual}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono bg-slate-50/50">{row.ytdBudget}</td>
                        <td className={`px-5 py-3 text-sm text-right font-mono font-medium bg-slate-50/50 ${isYtdPositive ? "text-emerald-600" : "text-amber-600"}`}>
                          {row.ytdAchievement}
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
