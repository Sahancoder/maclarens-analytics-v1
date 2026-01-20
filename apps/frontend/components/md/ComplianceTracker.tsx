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

      {/* Details Modal (Overlay) */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedCompany(null)}>
          <div 
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between ">
              <div>
                <h2 className="text-xl font-bold text-[#0b1f3a]">{selectedCompany.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={selectedCompany.status} />
                  <span className="text-xs text-slate-500 font-medium">• {activeTab === "submitted" ? "Submission Details" : "Pending Action"}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto">
              {selectedCompany.status === "submitted" ? (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-white p-1 rounded-full text-emerald-600 shadow-sm mt-0.5">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900">All Reports Submitted</h4>
                        <p className="text-xs text-emerald-700 mt-1 font-medium">
                          Last submission received on {selectedCompany.lastSubmission}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submission History</h4>
                    <div className="space-y-3">
                      {selectedCompany.submissions.map(sub => (
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
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className={`border rounded-xl p-4 shadow-sm ${selectedCompany.status === "overdue" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${selectedCompany.status === "overdue" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className={`text-base font-bold ${selectedCompany.status === "overdue" ? "text-red-900" : "text-amber-900"}`}>
                          Submission {selectedCompany.status === "overdue" ? "Overdue" : "Pending"}
                        </h4>
                        <p className={`text-sm mt-1 font-medium ${selectedCompany.status === "overdue" ? "text-red-700" : "text-amber-700"}`}>
                          Due date was <span className="font-bold">{selectedCompany.dueDate}</span>. Immediate action required.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Required Actions Card */}
                  <div className="space-y-3">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Required Actions</h4>
                     <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-slate-600" />
                            </div>
                            <span className="text-sm font-semibold text-slate-900">Actuals + Budget</span>
                          </div>
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Missing</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-500 font-medium">Finance Officer</span>
                           <span className="text-slate-400 italic">Not assigned</span>
                        </div>
                     </div>
                  </div>
                  
                  {/* Send Reminder Section */}
                  <div className="pt-2">
                     <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Send Reminder</label>
                     <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                       <textarea 
                         className="w-full bg-transparent border-none p-3 text-sm focus:ring-0 placeholder:text-slate-400 min-h-[80px] resize-none"
                         placeholder="Type a message to the finance team..."
                         defaultValue={`Please submit the monthly reports for ${selectedCompany.name} as soon as possible.`}
                       />
                       <div className="flex justify-end p-2 border-t border-slate-200">
                          <button className="px-4 py-2 bg-[#0b1f3a] text-white rounded-lg text-sm font-semibold hover:bg-[#0b1f3a]/90 transition-all shadow-sm flex items-center gap-2">
                            Send Reminder <ChevronRight className="w-4 h-4" />
                          </button>
                       </div>
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
