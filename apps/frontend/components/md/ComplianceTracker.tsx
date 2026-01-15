"use client";

import { useState } from "react";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  FileText, 
  X, 
  Calendar, 
  User, 
  Building2 
} from "lucide-react";

// ============ TYPES ============

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
  dueDate: string; // "Jan 15, 2026"
  auditDate?: string;
  lastSubmission?: string;
  submissions: SubmissionEntry[];
}

interface ClusterCompliance {
  id: string;
  name: string;
  companies: CompanyCompliance[];
}

// ============ MOCK DATA ============

const mockClusters: ClusterCompliance[] = [
  {
    id: "liner",
    name: "Liner Services",
    companies: [
      {
        id: "c1",
        name: "Liner Shipping",
        status: "submitted",
        dueDate: "Jan 15, 2026",
        lastSubmission: "Jan 12, 2026",
        submissions: [
          { id: "s1", type: "Actual", date: "Jan 12, 2026", submittedBy: "Amara Perera", version: 1, status: "approved" },
          { id: "s2", type: "Forecast", date: "Jan 12, 2026", submittedBy: "Amara Perera", version: 1, status: "pending_review" }
        ]
      },
      {
        id: "c2",
        name: "Liner Logistics",
        status: "pending",
        dueDate: "Jan 15, 2026",
        submissions: []
      }
    ]
  },
  {
    id: "lube",
    name: "Lube 01",
    companies: [
      {
        id: "c3",
        name: "MLL-Automotive",
        status: "submitted",
        dueDate: "Jan 15, 2026",
        lastSubmission: "Jan 14, 2026",
        submissions: [
          { id: "s3", type: "Actual", date: "Jan 14, 2026", submittedBy: "Sunil Silva", version: 2, status: "approved" }
        ]
      },
      {
        id: "c4",
        name: "MLL-Industrial",
        status: "pending",
        dueDate: "Jan 15, 2026",
        submissions: []
      },
      {
        id: "c5",
        name: "Mckupler",
        status: "overdue",
        dueDate: "Jan 10, 2026",
        submissions: []
      }
    ]
  },
  {
    id: "gac",
    name: "GAC Group",
    companies: [
      {
        id: "c8",
        name: "GSL",
        status: "submitted",
        dueDate: "Jan 15, 2026",
        lastSubmission: "Jan 10, 2026",
        submissions: [
          { id: "s4", type: "Actual", date: "Jan 10, 2026", submittedBy: "Kamal Dias", version: 1, status: "approved" }
        ]
      }
    ]
  },
  {
    id: "strategic",
    name: "Strategic Investments",
    companies: [
      {
        id: "c21",
        name: "MGML",
        status: "pending",
        dueDate: "Jan 15, 2026",
        submissions: []
      }
    ]
  }
];

// ============ SUB-COMPONENTS ============

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

// ============ MAIN COMPONENT ============

export function ComplianceTracker() {
  const [activeTab, setActiveTab] = useState<"submitted" | "not_submitted">("not_submitted");
  const [expandedClusters, setExpandedClusters] = useState<string[]>(["lube", "liner"]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyCompliance | null>(null);

  // Filter Data
  const filteredClusters = mockClusters.map(cluster => {
    const filteredCompanies = cluster.companies.filter(c => {
      if (activeTab === "submitted") return c.status === "submitted";
      return c.status === "pending" || c.status === "overdue";
    });
    return { ...cluster, companies: filteredCompanies };
  }).filter(c => c.companies.length > 0);

  // Counts
  const totalSubmitted = mockClusters.reduce((acc, c) => acc + c.companies.filter(x => x.status === "submitted").length, 0);
  const totalNotSubmitted = mockClusters.reduce((acc, c) => acc + c.companies.filter(x => x.status !== "submitted").length, 0);

  const toggleCluster = (id: string) => {
    setExpandedClusters(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header & Tabs */}
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
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-1">
                {totalSubmitted}
              </span>
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
              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs ml-1">
                {totalNotSubmitted}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50 rounded-b-xl">
        <div className="space-y-4">
          {filteredClusters.map(cluster => (
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
                  {cluster.companies.map(company => (
                    <div 
                      key={company.id}
                      onClick={() => setSelectedCompany(company)}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {activeTab === "submitted" ? (
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${company.status === "overdue" ? "bg-red-500" : "bg-amber-400"}`} />
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-900 group-hover:text-[#0b1f3a] transition-colors">
                            {company.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {company.status === "submitted" 
                              ? `Submitted: ${company.lastSubmission}` 
                              : `Due: ${company.dueDate}`
                            }
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

      {/* Details Drawer (Overlay) */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedCompany(null)}>
          <div 
            className="w-full max-w-md bg-white h-full shadow-2xl p-0 flex flex-col animate-in slide-in-from-right duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedCompany.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={selectedCompany.status} />
                  <span className="text-xs text-slate-500">• {activeTab === "submitted" ? "Submission Details" : "Pending Action"}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCompany(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedCompany.status === "submitted" ? (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-900">All Reports Submitted</h4>
                        <p className="text-xs text-emerald-700 mt-1">
                          Last submission received on {selectedCompany.lastSubmission}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Submission History</h4>
                    <div className="space-y-3">
                      {selectedCompany.submissions.map(sub => (
                        <div key={sub.id} className="border border-slate-200 rounded-lg p-4 hover:border-[#0b1f3a] transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#0b1f3a]" />
                              <span className="font-semibold text-sm text-slate-900">{sub.type} Report</span>
                            </div>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">v{sub.version}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-500">
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
                <div className="space-y-6">
                  <div className={`border rounded-lg p-4 ${selectedCompany.status === "overdue" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className={`w-5 h-5 mt-0.5 ${selectedCompany.status === "overdue" ? "text-red-600" : "text-amber-600"}`} />
                      <div>
                        <h4 className={`text-sm font-semibold ${selectedCompany.status === "overdue" ? "text-red-900" : "text-amber-900"}`}>
                          Submission {selectedCompany.status === "overdue" ? "Overdue" : "Pending"}
                        </h4>
                        <p className={`text-xs mt-1 ${selectedCompany.status === "overdue" ? "text-red-700" : "text-amber-700"}`}>
                          Due date was {selectedCompany.dueDate}. Immediate action required.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Required Actions</h4>
                     <div className="border border-slate-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-slate-700">Actuals + Budget</span>
                          <span className="text-xs font-semibold text-red-600">Missing</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                           <span>Finance Officer</span>
                           <span>Not assigned</span>
                        </div>
                     </div>
                     
                     <div className="pt-4">
                        <label className="text-xs font-medium text-slate-700 mb-1.5 block">Send Reminder</label>
                        <textarea 
                          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#0b1f3a]/20 focus:border-[#0b1f3a] outline-none"
                          rows={3}
                          placeholder="Type a message to the finance team..."
                          defaultValue={`Please submit the monthly reports for ${selectedCompany.name} as soon as possible.`}
                        />
                        <button className="mt-3 w-full bg-[#0b1f3a] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#0b1f3a]/90 transition-colors">
                          Send Reminder
                        </button>
                     </div>
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
