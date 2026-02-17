"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
  X,
  Calendar,
  User,
  Building2,
} from "lucide-react";
import { usePerformanceHierarchy } from "@/hooks/use-api";

type SubmissionStatus = "submitted" | "pending" | "overdue";

interface SubmissionEntry {
  id: string;
  type: "Actual" | "Budget" | "Forecast";
  date: string;
  submittedBy: string;
  version: number;
  status: "approved" | "pending_review";
}

interface CompanyCompliance {
  id: string;
  name: string;
  status: SubmissionStatus;
  dueDate: string;
  lastSubmission?: string;
  submissions: SubmissionEntry[];
}

interface ClusterCompliance {
  id: string;
  name: string;
  companies: CompanyCompliance[];
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
        <CheckCircle className="w-3 h-3 mr-1" /> Submitted
      </span>
    );
  }
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        <AlertCircle className="w-3 h-3 mr-1" /> Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
      <Clock className="w-3 h-3 mr-1" /> Pending
    </span>
  );
}

export function ComplianceTracker() {
  const now = new Date();
  const hierarchyState = usePerformanceHierarchy(now.getFullYear(), now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<"submitted" | "not_submitted">("not_submitted");
  const [expandedClusters, setExpandedClusters] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyCompliance | null>(null);

  const clusters = useMemo<ClusterCompliance[]>(() => {
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

    return (hierarchyState.data?.clusters || []).map((cluster) => ({
      id: cluster.id,
      name: cluster.name,
      companies: cluster.companies.map((company) => {
        const isSubmitted = (company.report_status || "").toLowerCase() === "approved"
          || (company.report_status || "").toLowerCase() === "submitted";
        const status: SubmissionStatus = isSubmitted ? "submitted" : "pending";
        return {
          id: company.id,
          name: company.name,
          status,
          dueDate,
          lastSubmission: isSubmitted ? now.toLocaleDateString() : undefined,
          submissions: isSubmitted
            ? [{
                id: `${company.id}-actual`,
                type: "Actual",
                date: now.toLocaleDateString(),
                submittedBy: "Finance Team",
                version: 1,
                status: (company.report_status || "").toLowerCase() === "approved" ? "approved" : "pending_review",
              }]
            : [],
        };
      }),
    }));
  }, [hierarchyState.data, now]);

  const filteredClusters = clusters
    .map((cluster) => ({
      ...cluster,
      companies: cluster.companies.filter((c) =>
        activeTab === "submitted" ? c.status === "submitted" : c.status !== "submitted"
      ),
    }))
    .filter((c) => c.companies.length > 0);

  const totalSubmitted = clusters.reduce((acc, c) => acc + c.companies.filter((x) => x.status === "submitted").length, 0);
  const totalNotSubmitted = clusters.reduce((acc, c) => acc + c.companies.filter((x) => x.status !== "submitted").length, 0);

  const toggleCluster = (id: string) => {
    setExpandedClusters((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="border-b border-slate-200">
        <div className="p-5 pb-0">
          <h3 className="text-lg font-bold text-slate-900">Submission Compliance</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Track monthly reporting status across the group</p>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("submitted")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "submitted"
                  ? "border-[#0b1f3a] text-[#0b1f3a]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Submitted
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-1">{totalSubmitted}</span>
            </button>
            <button
              onClick={() => setActiveTab("not_submitted")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "not_submitted"
                  ? "border-[#0b1f3a] text-[#0b1f3a]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Not Submitted
              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs ml-1">{totalNotSubmitted}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 bg-slate-50 rounded-b-xl">
        <div className="space-y-4">
          {filteredClusters.map((cluster) => (
            <div key={cluster.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCluster(cluster.id)}
                className="w-full px-4 py-3 bg-slate-50/50 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white border border-slate-200 rounded text-slate-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800">{cluster.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    {cluster.companies.length} {activeTab === "submitted" ? "Submitted" : "Pending"}
                  </span>
                  {expandedClusters.includes(cluster.id) ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {expandedClusters.includes(cluster.id) && (
                <div className="divide-y divide-slate-100">
                  {cluster.companies.map((company) => (
                    <div
                      key={company.id}
                      onClick={() => setSelectedCompany(company)}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {activeTab === "submitted" ? (
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-900 group-hover:text-[#0b1f3a] transition-colors">
                            {company.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {company.status === "submitted" ? `Submitted: ${company.lastSubmission}` : `Due: ${company.dueDate}`}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={company.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredClusters.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No companies found in this list.</p>
            </div>
          )}
        </div>
      </div>

      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedCompany(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between ">
              <div>
                <h2 className="text-xl font-bold text-[#0b1f3a]">{selectedCompany.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={selectedCompany.status} />
                  <span className="text-xs text-slate-500 font-medium">• Submission Details</span>
                </div>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {selectedCompany.status === "submitted" ? (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-white p-1 rounded-full text-emerald-600 shadow-sm mt-0.5">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900">Submission Received</h4>
                        <p className="text-xs text-emerald-700 mt-1 font-medium">
                          Last submission received on {selectedCompany.lastSubmission}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submission History</h4>
                    <div className="space-y-3">
                      {selectedCompany.submissions.map((sub) => (
                        <div key={sub.id} className="border border-slate-200 rounded-xl p-4 hover:border-[#0b1f3a]/30 transition-colors bg-slate-50/50">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                                <FileText className="w-4 h-4 text-[#0b1f3a]" />
                              </div>
                              <span className="font-bold text-sm text-slate-900">{sub.type} Report</span>
                            </div>
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full uppercase tracking-wide">v{sub.version}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-500 font-medium border-t border-slate-200 pt-3">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {sub.date}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {sub.submittedBy}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <h4 className="text-base font-bold text-amber-900">Submission Pending</h4>
                    <p className="text-sm mt-1 font-medium text-amber-700">Due date: {selectedCompany.dueDate}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

