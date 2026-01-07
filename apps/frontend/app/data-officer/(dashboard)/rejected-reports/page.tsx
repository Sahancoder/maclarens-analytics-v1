"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, History, CheckCircle2, XCircle, ChevronDown, ChevronUp, Edit3, Send, X } from "lucide-react";

// ==================== TYPES ====================
interface RejectedReport {
  id: string;
  companyName: string;
  companyCode: string;
  cluster: string;
  period: string; // e.g., "November 2024"
  reportType: "Actual";
  rejectedBy: string;
  rejectedByTitle: string;
  rejectedAt: string; // ISO timestamp
  reason: string;
  subStatus: "Rejected – Correction Required" | "Rejected – Data Inconsistency";
  // Actual report data (for editing)
  reportData: {
    revenue: string;
    gp: string;
    otherIncome: string;
    personalExpenses: string;
    adminExpenses: string;
    sellingExpenses: string;
    financialExpenses: string;
    depreciation: string;
    provisions: string;
    provisionsSign: "+" | "-";
    exchange: string;
    exchangeSign: "+" | "-";
    nonOpsExpenses: string;
    nonOpsIncome: string;
  };
  submittedAt?: string; // Original submission timestamp
  hasUnsavedChanges?: boolean;
}

interface TimelineEvent {
  type: "submitted" | "rejected" | "commented" | "draft";
  timestamp: string;
  actor: string;
  actorRole?: string;
  comment?: string;
}

// ==================== SAMPLE DATA ====================
const REJECTED_REPORTS_DATA: RejectedReport[] = [
  {
    id: "MMA-2024-11",
    companyName: "McLarens Maritime Academy",
    companyCode: "MMA",
    cluster: "Shipping Services & Logistics",
    period: "November 2024",
    reportType: "Actual",
    rejectedBy: "Anika Perera",
    rejectedByTitle: "Director – Finance",
    rejectedAt: "2024-12-04T10:15:00Z",
    submittedAt: "2024-12-02T14:30:00Z",
    reason: "Variance >15% in financial expenses compared to budget. Missing explanatory note on exchange losses in non-operating items section.",
    subStatus: "Rejected – Correction Required",
    reportData: {
      revenue: "25000000",
      gp: "8500000",
      otherIncome: "150000",
      personalExpenses: "3200000",
      adminExpenses: "1800000",
      sellingExpenses: "950000",
      financialExpenses: "1250000",
      depreciation: "750000",
      provisions: "100000",
      provisionsSign: "-",
      exchange: "85000",
      exchangeSign: "-",
      nonOpsExpenses: "50000",
      nonOpsIncome: "200000",
    },
  },
  {
    id: "GSL-2024-10",
    companyName: "GAC Shipping Limited",
    companyCode: "GSL",
    cluster: "GAC Cluster",
    period: "October 2024",
    reportType: "Actual",
    rejectedBy: "Chamara Dias",
    rejectedByTitle: "Director – Operations",
    rejectedAt: "2024-11-28T08:40:00Z",
    submittedAt: "2024-11-26T16:20:00Z",
    reason: "Gross profit figure has been re-stated without supporting reconciliation schedule. Depreciation note is absent from financial statements.",
    subStatus: "Rejected – Data Inconsistency",
    reportData: {
      revenue: "18500000",
      gp: "6200000",
      otherIncome: "95000",
      personalExpenses: "2400000",
      adminExpenses: "1350000",
      sellingExpenses: "720000",
      financialExpenses: "890000",
      depreciation: "520000",
      provisions: "75000",
      provisionsSign: "+",
      exchange: "42000",
      exchangeSign: "+",
      nonOpsExpenses: "30000",
      nonOpsIncome: "120000",
    },
  },
  {
    id: "SPL-2024-09",
    companyName: "Spectra Logistics",
    companyCode: "SPL",
    cluster: "Warehouse & Logistics",
    period: "September 2024",
    reportType: "Actual",
    rejectedBy: "Liam Fernando",
    rejectedByTitle: "Director – Shared Services",
    rejectedAt: "2024-11-18T14:05:00Z",
    submittedAt: "2024-11-16T11:45:00Z",
    reason: "Provision reversal amount not explained in notes. Non-operating income incorrectly netted against expenses instead of shown separately.",
    subStatus: "Rejected – Correction Required",
    reportData: {
      revenue: "12000000",
      gp: "4100000",
      otherIncome: "65000",
      personalExpenses: "1650000",
      adminExpenses: "920000",
      sellingExpenses: "480000",
      financialExpenses: "620000",
      depreciation: "380000",
      provisions: "55000",
      provisionsSign: "+",
      exchange: "28000",
      exchangeSign: "-",
      nonOpsExpenses: "22000",
      nonOpsIncome: "85000",
    },
  },
];

// ==================== HELPER FUNCTIONS ====================
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDaysAgo(isoString: string): number {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

// ==================== REPORT CARD COMPONENT ====================
function RejectedReportCard({ report, onResubmit }: { report: RejectedReport; onResubmit: (id: string) => void }) {
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const daysAgo = getDaysAgo(report.rejectedAt);
  const isOverdue = daysAgo > 7;

  // Generate timeline events
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];
    
    // Draft event (2 days before submission)
    if (report.submittedAt) {
      const draftDate = new Date(new Date(report.submittedAt).getTime() - 2 * 24 * 60 * 60 * 1000);
      events.push({
        type: "draft",
        timestamp: draftDate.toISOString(),
        actor: "Data Officer",
        actorRole: "Data Entry Team",
      });
    }

    // Submitted event
    if (report.submittedAt) {
      events.push({
        type: "submitted",
        timestamp: report.submittedAt,
        actor: "Data Officer",
        actorRole: "Data Entry Team",
      });
    }

    // Rejected event
    events.push({
      type: "rejected",
      timestamp: report.rejectedAt,
      actor: report.rejectedBy,
      actorRole: report.rejectedByTitle,
      comment: report.reason,
    });

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [report]);

  const handleReviewEdit = () => {
    // Store the report data in sessionStorage to pre-fill the dashboard form
    sessionStorage.setItem('editingRejectedReport', JSON.stringify({
      reportId: report.id,
      companyName: report.companyName,
      companyCode: report.companyCode,
      cluster: report.cluster,
      period: report.period,
      formData: report.reportData,
      rejectionReason: report.reason,
    }));
    
    // Navigate to dashboard
    router.push('/data-officer/dashboard');
  };

  const handleResubmit = async () => {
    setIsResubmitting(true);
    
    // TODO: Replace with actual GraphQL mutation
    // mutation resubmitReport($reportId: ID!) {
    //   resubmitReport(reportId: $reportId) {
    //     id
    //     status
    //     submittedAt
    //   }
    // }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsResubmitting(false);
    setShowResubmitModal(false);
    onResubmit(report.id);
  };

  const handleResubmitClick = () => {
    setShowResubmitModal(true);
  };

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "draft": return "";
      case "submitted": return "";
      case "rejected": return "";
      case "commented": return "";
      default: return "•";
    }
  };

  const getEventColor = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "draft": return "bg-slate-400";
      case "submitted": return "bg-blue-500";
      case "rejected": return "bg-red-500";
      case "commented": return "bg-amber-500";
      default: return "bg-slate-300";
    }
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
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200">
            {report.subStatus}
          </span>
          {isOverdue && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold border border-orange-200">
              <Clock className="h-3.5 w-3.5" />
              Overdue ({daysAgo} days)
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Report Identity */}
        <div className="mb-5">
          <h3 className="text-xl font-bold text-slate-900 mb-1">
            {report.companyName}
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            <div>
              <span className="font-semibold text-slate-700">Code:</span> {report.companyCode}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Cluster:</span> {report.cluster}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Period:</span> {report.period}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Type:</span> {report.reportType}
            </div>
          </div>
        </div>

        {/* Rejection Metadata */}
        <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Rejected by:</span> {report.rejectedBy}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{report.rejectedByTitle}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{formatDateTime(report.rejectedAt)}</p>
              <p className="text-xs text-slate-500">{daysAgo} {daysAgo === 1 ? 'day' : 'days'} ago</p>
            </div>
          </div>
        </div>

        {/* Rejection Reason - Highlighted */}
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-800 leading-relaxed">{report.reason}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          <button 
            onClick={handleReviewEdit}
            className="inline-flex items-center gap-2 h-11 px-6 bg-[#0b1f3a] text-white text-sm font-semibold rounded-lg hover:bg-[#0b1f3a]/90 transition-all shadow-sm hover:shadow-md"
          >
            <Edit3 className="h-4 w-4" />
            Review & Edit
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center gap-2 h-11 px-5 bg-white border-2 border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all"
          >
            <History className="h-4 w-4" />
            View History
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button 
            onClick={handleResubmitClick}
            disabled={isResubmitting}
            className="inline-flex items-center gap-2 h-11 px-5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Send className="h-4 w-4" />
            Resubmit for Review
          </button>
        </div>

        {/* History Panel (Collapsible) */}
        {showHistory && (
          <div className="mt-4 p-5 bg-slate-50 border-2 border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-800">Submission Timeline & Comments</h4>
              <span className="text-xs text-slate-500">{timelineEvents.length} events</span>
            </div>
            
            <div className="space-y-4">
              {timelineEvents.map((event, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${getEventColor(event.type)} mt-1.5 ring-4 ring-slate-50`} />
                    {index < timelineEvents.length - 1 && (
                      <div className="flex-1 w-0.5 bg-slate-200 my-1 min-h-[20px]" />
                    )}
                  </div>
                  
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 capitalize flex items-center gap-2">
                          <span>{getEventIcon(event.type)}</span>
                          {event.type === "draft" && "Draft Created"}
                          {event.type === "submitted" && "Submitted for Review"}
                          {event.type === "rejected" && "Rejected by Director"}
                          {event.type === "commented" && "Comment Added"}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">{formatDateTime(event.timestamp)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          By {event.actor} {event.actorRole && `• ${event.actorRole}`}
                        </p>
                      </div>
                    </div>
                    
                    {event.comment && (
                      <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Comment</p>
                        {event.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 italic">
                All timeline events are immutable and maintained for audit compliance.
              </p>
            </div>
          </div>
        )}

        {/* Audit Safety Notice */}
        <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-800">Audit Note:</span> Rejected reports cannot be deleted or duplicated. 
            All comments are immutable, time-stamped, and linked to user IDs for compliance tracking.
          </p>
        </div>
      </div>

      {/* Resubmit Confirmation Modal */}
      {showResubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Confirm Resubmission</h3>
                <p className="text-sm text-slate-600">
                  Are you sure you want to resubmit this report for review?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Company:</span>
                <span className="font-semibold text-slate-800">{report.companyName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Period:</span>
                <span className="font-semibold text-slate-800">{report.period}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Report Type:</span>
                <span className="font-semibold text-slate-800">{report.reportType}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResubmitModal(false)}
                disabled={isResubmitting}
                className="flex-1 h-11 px-4 bg-white border-2 border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleResubmit}
                disabled={isResubmitting}
                className="flex-1 h-11 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isResubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resubmitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Confirm Resubmit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== EMPTY STATE COMPONENT ====================
function EmptyState() {
  return (
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 mb-4">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        All Clear!
      </h3>
      <p className="text-sm text-slate-600 max-w-md mx-auto">
        You have no rejected reports. All submissions are up to date and have been approved or are pending review.
      </p>
    </div>
  );
}

// ==================== MAIN PAGE COMPONENT ====================
export default function RejectedReportsPage() {
  const [reports, setReports] = useState<RejectedReport[]>(REJECTED_REPORTS_DATA);
  const [resubmitSuccess, setResubmitSuccess] = useState<string | null>(null);

  // Sort by most recently rejected first
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => 
      new Date(b.rejectedAt).getTime() - new Date(a.rejectedAt).getTime()
    );
  }, [reports]);

  const totalCount = sortedReports.length;
  const overdueCount = sortedReports.filter(r => getDaysAgo(r.rejectedAt) > 7).length;

  const handleResubmit = (reportId: string) => {
    // Remove the report from the rejected list (it's now submitted)
    setReports(prev => prev.filter(r => r.id !== reportId));
    setResubmitSuccess(reportId);
    
    // Clear success message after 5 seconds
    setTimeout(() => setResubmitSuccess(null), 5000);
  };

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
          {totalCount > 0 && (
            <div className="flex gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">{totalCount}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Total Rejected</div>
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
        </div>

        {/* Info Banner */}
        {totalCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <span className="font-semibold">Action Required:</span> Please review and correct the rejected reports below. 
              Reports pending for more than 7 days are marked as overdue.
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Success Message */}
        {resubmitSuccess && (
          <div className="max-w-5xl mx-auto mb-4">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-900">
                  Report Resubmitted Successfully!
                </p>
                <p className="text-sm text-emerald-700 mt-0.5">
                  The report has been sent for review. The Director will be notified and you'll receive an update once reviewed.
                </p>
              </div>
              <button 
                onClick={() => setResubmitSuccess(null)}
                className="text-emerald-600 hover:text-emerald-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {totalCount === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-w-5xl mx-auto space-y-4">
            {sortedReports.map((report) => (
              <RejectedReportCard key={report.id} report={report} onResubmit={handleResubmit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
