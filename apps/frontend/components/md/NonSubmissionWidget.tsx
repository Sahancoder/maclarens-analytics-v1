"use client";

import { useState } from "react";
import { AlertTriangle, Clock, Download, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface OverdueCompany {
  id: string;
  name: string;
  cluster: string;
  daysOverdue: number;
  director: string;
  directorEmail: string;
  lastSubmission: string;
}

interface ClusterSubmission {
  cluster: string;
  totalCompanies: number;
  submitted: number;
  missing: number;
}

// Mock data - will be replaced with real API data
const overdueCompanies: OverdueCompany[] = [
  { id: "IOE", name: "Interocean Energy (Pvt) Ltd", cluster: "Bunkering & Renewables", daysOverdue: 15, director: "John Smith", directorEmail: "john@maclarens.com", lastSubmission: "Sep 2025" },
  { id: "GMSL", name: "GAC Machine Services (Pvt) Ltd", cluster: "GAC Cluster", daysOverdue: 12, director: "Jane Doe", directorEmail: "jane@maclarens.com", lastSubmission: "Sep 2025" },
  { id: "Carplan", name: "Carplan Lubricants (Private) Limited", cluster: "Lubricant II", daysOverdue: 10, director: "Bob Wilson", directorEmail: "bob@maclarens.com", lastSubmission: "Aug 2025" },
  { id: "InteroceanLubricants", name: "Interocean Lubricants (Pvt) Ltd", cluster: "Lubricant II", daysOverdue: 8, director: "Alice Brown", directorEmail: "alice@maclarens.com", lastSubmission: "Sep 2025" },
  { id: "Topas", name: "Topaz Hotels Limited", cluster: "Hotel & Leisure", daysOverdue: 5, director: "Charlie Davis", directorEmail: "charlie@maclarens.com", lastSubmission: "Sep 2025" },
];

const clusterSubmissions: ClusterSubmission[] = [
  { cluster: "Bunkering", totalCompanies: 1, submitted: 0, missing: 1 },
  { cluster: "Lubricant II", totalCompanies: 5, submitted: 3, missing: 2 },
  { cluster: "GAC Cluster", totalCompanies: 5, submitted: 4, missing: 1 },
  { cluster: "Hotel & Leisure", totalCompanies: 1, submitted: 0, missing: 1 },
  { cluster: "Liner", totalCompanies: 3, submitted: 3, missing: 0 },
  { cluster: "Lubricant I", totalCompanies: 5, submitted: 5, missing: 0 },
  { cluster: "Shipping Services", totalCompanies: 6, submitted: 6, missing: 0 },
  { cluster: "Ship Supply", totalCompanies: 9, submitted: 9, missing: 0 },
  { cluster: "Property", totalCompanies: 9, submitted: 9, missing: 0 },
  { cluster: "Warehouse", totalCompanies: 2, submitted: 2, missing: 0 },
  { cluster: "Manufacturing", totalCompanies: 4, submitted: 4, missing: 0 },
  { cluster: "Strategic Inv.", totalCompanies: 1, submitted: 1, missing: 0 },
];

export function NonSubmissionWidget() {
  const [showDirectors, setShowDirectors] = useState(false);
  const [expandedView, setExpandedView] = useState<"missing" | "submitted" | null>("missing");

  const totalMissing = clusterSubmissions.reduce((sum, c) => sum + c.missing, 0);
  const totalSubmitted = clusterSubmissions.reduce((sum, c) => sum + c.submitted, 0);
  const totalCompanies = clusterSubmissions.reduce((sum, c) => sum + c.totalCompanies, 0);
  const submissionRate = ((totalSubmitted) / totalCompanies * 100).toFixed(1);

  // Chart data - only clusters with missing submissions
  const chartData = clusterSubmissions
    .filter(c => c.missing > 0)
    .sort((a, b) => b.missing - a.missing);

  // Submitted clusters
  const submittedClusters = clusterSubmissions.filter(c => c.missing === 0);

  const downloadReport = () => {
    const csv = [
      ["Status", "Company Code", "Company Name", "Cluster", "Days Overdue", "Director", "Email", "Last Submission"],
      ...overdueCompanies.map(c => ["Not Submitted", c.id, c.name, c.cluster, c.daysOverdue, c.director, c.directorEmail, c.lastSubmission])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submission-status-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
            totalMissing > 0 ? "bg-red-100" : "bg-emerald-100"
          }`}>
            {totalMissing > 0 ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Submission Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="text-emerald-600 font-medium">{totalSubmitted} submitted</span>
              {" • "}
              <span className={totalMissing > 0 ? "text-red-600 font-medium" : "text-slate-500"}>{totalMissing} pending</span>
              {" • "}
              {submissionRate}% complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadReport}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setShowDirectors(!showDirectors)}
            className="px-3 py-1.5 text-xs font-medium text-[#0b1f3a] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1"
          >
            Director Contacts
            {showDirectors ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Director Contacts Dropdown */}
      {showDirectors && (
        <div className="px-5 py-4 bg-blue-50 border-b border-blue-200">
          <h4 className="text-sm font-semibold text-[#0b1f3a] mb-3">Contact Directors for Pending Submissions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdueCompanies.map((company) => (
              <div key={company.id} className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="text-sm font-medium text-slate-800">{company.director}</p>
                <p className="text-xs text-blue-600">{company.directorEmail}</p>
                <p className="text-xs text-slate-500 mt-1">{company.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Toggle Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setExpandedView(expandedView === "missing" ? null : "missing")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              expandedView === "missing" 
                ? "bg-red-50 text-red-700 border border-red-200" 
                : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Not Submitted ({totalMissing})
            </span>
          </button>
          <button
            onClick={() => setExpandedView(expandedView === "submitted" ? null : "submitted")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              expandedView === "submitted" 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Submitted ({totalSubmitted})
            </span>
          </button>
        </div>

        {/* Not Submitted Section */}
        {expandedView === "missing" && (
          <div>
            {/* Bar Chart - Using blue color */}
            {chartData.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Missing by Cluster</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="cluster" 
                        tick={{ fontSize: 10 }} 
                        angle={-45} 
                        textAnchor="end" 
                        height={60} 
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [`${value} companies missing`, "Count"]}
                      />
                      <Bar dataKey="missing" fill="#0b1f3a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Overdue Companies List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {overdueCompanies.map((company) => (
                <div
                  key={company.id}
                  className="p-3 rounded-lg bg-red-50 border border-red-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-slate-800 text-sm">{company.name}</span>
                      <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">{company.cluster}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {company.daysOverdue} days overdue
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700">
                      {company.daysOverdue}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted Section */}
        {expandedView === "submitted" && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {submittedClusters.map((cluster) => (
              <div
                key={cluster.cluster}
                className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-slate-800 text-sm">{cluster.cluster}</span>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {cluster.submitted} / {cluster.totalCompanies} companies submitted
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state when all submitted */}
        {totalMissing === 0 && expandedView === "missing" && (
          <div className="py-8 text-center bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-700">All companies have submitted!</p>
            <p className="text-xs text-emerald-600 mt-1">100% submission rate</p>
          </div>
        )}
      </div>
    </div>
  );
}
