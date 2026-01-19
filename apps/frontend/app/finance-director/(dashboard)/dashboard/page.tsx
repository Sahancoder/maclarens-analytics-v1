"use client";

import { useState, useEffect } from "react";
import { Building2, TrendingUp, TrendingDown, FileText, Clock, CheckCircle, Send, BarChart3, Flag, ChevronDown } from "lucide-react";
import Link from "next/link";

// Finance Director's assigned company (Default/Fallback)
const DEFAULT_COMPANY = {
  id: "mclarens-maritime",
  name: "McLarens Maritime Academy",
  cluster: "Shipping Services & Logistics",
  yearEnd: "March",
  financialYear: "FY 2025-26",
};

interface Company {
  id: string;
  name: string;
}

interface DashboardData {
  company: {
    name: string;
    cluster: string;
    financialYear: string;
  };
  kpis: {
    ytdGPMargin: string;
    ytdGPMarginChange: string;
    ytdGP: string;
    ytdGPChange: string;
    ytdPBTBefore: string;
    ytdPBTBeforeChange: string;
    pbtAchievement: string;
  };
}

// Mock pending reports from Finance Officers
const PENDING_REPORTS = [
  { 
    id: 1, 
    type: "Actual + Budget",
    month: "December 2025", 
    submittedBy: "Sahan Hettiarachchi", 
    submittedAt: "Jan 10, 2026",
    status: "pending_review",
    actualComplete: true,
    budgetComplete: true,
    pbtActual: "1,125,000",
    pbtBudget: "950,000",
    variance: "+18.42%",
    variancePositive: true,
  },
  { 
    id: 2, 
    type: "Actual Only",
    month: "November 2025", 
    submittedBy: "Sahan Hettiarachchi", 
    submittedAt: "Dec 15, 2025",
    status: "approved",
    actualComplete: true,
    budgetComplete: true,
    pbtActual: "980,000",
    pbtBudget: "1,050,000",
    variance: "-6.67%",
    variancePositive: false,
  },
];

// Mock KPI data for the company
// Mock KPI data for the company
const DEFAULT_COMPANY_KPIS = {
  ytdGPMargin: "35.2%",
  ytdGPMarginChange: "+8.5%",
  ytdGP: "44,176,000",
  ytdGPChange: "+12.3%",
  ytdPBTBefore: "12,450,000",
  ytdPBTBeforeChange: "+5.4%",
  pbtAchievement: "18.42%",
  pendingReports: 1,
  approvedReports: 11,
};

function StatCard({ title, value, change, positive, icon: Icon }: {
  title: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 ${positive ? "text-emerald-600" : "text-red-600"}`}>
              {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm font-medium">{change}</span>
              <span className="text-xs text-slate-400 ml-1">vs LY</span>
            </div>
          )}
        </div>
        <div className="h-11 w-11 rounded-lg bg-[#0b1f3a]/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[#0b1f3a]" />
        </div>
      </div>
    </div>
  );
}

export default function FinanceDirectorDashboard() {
  const [selectedReport, setSelectedReport] = useState<typeof PENDING_REPORTS[0] | null>(null);

  // Company Selector State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  // Initial Load: Fetch Companies
  useEffect(() => {
    // Mock API Call
    const fetchCompanies = async () => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockCompanies = [
        { id: "mclarens-maritime", name: "McLarens Maritime Academy" },
        { id: "mclarens-logistics", name: "McLarens Logistics" },
      ];

      setCompanies(mockCompanies);

      // Persistence Logic
      const savedId = localStorage.getItem("fd_selected_company");
      const validSavedId = mockCompanies.find(c => c.id === savedId)?.id;
      
      if (validSavedId) {
        setSelectedCompanyId(validSavedId);
      } else if (mockCompanies.length > 0) {
        setSelectedCompanyId(mockCompanies[0].id);
      }
    };

    fetchCompanies();
  }, []);

  // Fetch Dashboard Data when Company Changes
  useEffect(() => {
    if (!selectedCompanyId) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600));

      const isLogistics = selectedCompanyId === "mclarens-logistics";
      const multiplier = isLogistics ? 1.2 : 1.0;

      const mockData: DashboardData = {
        company: {
          name: isLogistics ? "McLarens Logistics" : DEFAULT_COMPANY.name,
          cluster: isLogistics ? "Logistics & Transport" : DEFAULT_COMPANY.cluster,
          financialYear: DEFAULT_COMPANY.financialYear,
        },
        kpis: {
          ytdGPMargin: isLogistics ? "38.5%" : DEFAULT_COMPANY_KPIS.ytdGPMargin,
          ytdGPMarginChange: DEFAULT_COMPANY_KPIS.ytdGPMarginChange,
          ytdGP: isLogistics ? "53,011,200" : DEFAULT_COMPANY_KPIS.ytdGP, // x1.2 approx
          ytdGPChange: DEFAULT_COMPANY_KPIS.ytdGPChange,
          ytdPBTBefore: isLogistics ? "14,940,000" : DEFAULT_COMPANY_KPIS.ytdPBTBefore, // x1.2 approx
          ytdPBTBeforeChange: DEFAULT_COMPANY_KPIS.ytdPBTBeforeChange,
          pbtAchievement: isLogistics ? "22.1%" : DEFAULT_COMPANY_KPIS.pbtAchievement,
        }
      };

      setDashboardData(mockData);
      setLoading(false);
      localStorage.setItem("fd_selected_company", selectedCompanyId);
    };

    fetchDashboardData();
  }, [selectedCompanyId]);

  // Derived State
  const currentData = dashboardData || {
    company: DEFAULT_COMPANY,
    kpis: DEFAULT_COMPANY_KPIS
  };

  const pendingCount = PENDING_REPORTS.filter(r => r.status === "pending_review").length;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Company Info Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#0b1f3a]/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-[#0b1f3a]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{currentData.company.name}</h2>
              <p className="text-sm text-slate-500">{currentData.company.cluster} • {currentData.company.financialYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Company Selector */}
            {companies.length > 1 && (
              <div className="relative">
                <select
                  value={selectedCompanyId || ""}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="h-10 pl-3 pr-8 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 appearance-none cursor-pointer min-w-[200px]"
                  disabled={loading}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            )}
            
            {loading && (
              <div className="h-5 w-5 border-2 border-[#0b1f3a] border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* KPI Cards */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Company Performance (YTD)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="YTD GPMargin" 
              value={currentData.kpis.ytdGPMargin}
              change={currentData.kpis.ytdGPMarginChange}
              positive={true}
              icon={BarChart3}
            />
            <StatCard 
              title="YTD GP" 
              value={`LKR ${currentData.kpis.ytdGP}`}
              change={currentData.kpis.ytdGPChange}
              positive={true}
              icon={TrendingUp}
            />
            <StatCard 
              title="YTD PBT Before" 
              value={`LKR ${currentData.kpis.ytdPBTBefore}`}
              change={currentData.kpis.ytdPBTBeforeChange}
              positive={true}
              icon={BarChart3}
            />
            <StatCard 
              title="PBT Before Achievement (YTD)" 
              value={currentData.kpis.pbtAchievement}
              icon={Clock}
            />
          </div>
        </div>

        {/* Reports Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Reports from Finance Officer</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Review Actual + Budget submissions and submit to MD</p>
                </div>
                {pendingCount > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    {pendingCount} pending
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {PENDING_REPORTS.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors ${
                      selectedReport?.id === report.id ? "bg-slate-50 border-l-2 border-l-[#0b1f3a]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{report.month}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            report.status === "pending_review" 
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {report.status === "pending_review" ? "Pending Review" : "Submitted to MD"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {report.type} • Submitted by {report.submittedBy}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${report.variancePositive ? "text-emerald-600" : "text-red-600"}`}>
                          {report.variance}
                        </p>
                        <p className="text-xs text-slate-400">{report.submittedAt}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            {/* Company Rank (Replaces Quick Actions) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center min-h-[180px]">
              <div className="mb-4 relative">
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="h-12 w-12 text-slate-300"
                >
                  {/* Static Pole */}
                  <line x1="4" x2="4" y1="2" y2="22" />
                  
                  {/* Animated Cloth */}
                  <path 
                    d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" 
                    fill="white" 
                    className="animate-cloth-wave"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Company Rank</h3>
              <p className="text-4xl font-bold text-slate-900 mt-2 mb-1">#2</p>
              <p className="text-xs text-slate-400 font-medium whitespace-nowrap mt-1">
                Based on Profit Before Tax (PBT) & PBT Achievement %
              </p>
            </div>

            {/* Selected Report Preview */}
            {selectedReport && selectedReport.status === "pending_review" && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Selected: {selectedReport.month}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">PBT Actual</span>
                    <span className="font-medium text-slate-900">LKR {selectedReport.pbtActual}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">PBT Budget</span>
                    <span className="font-medium text-slate-900">LKR {selectedReport.pbtBudget}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Variance</span>
                    <span className={`font-semibold ${selectedReport.variancePositive ? "text-emerald-600" : "text-red-600"}`}>
                      {selectedReport.variance}
                    </span>
                  </div>
                  <hr className="my-3" />
                  <div className="flex items-center gap-2 text-sm">
                    {selectedReport.actualComplete && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="h-4 w-4" /> Actual
                      </span>
                    )}
                    {selectedReport.budgetComplete && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="h-4 w-4" /> Budget
                      </span>
                    )}
                  </div>
                  <div className="pt-3 space-y-2">
                    <Link
                      href="/finance-director/reports"
                      className="flex items-center justify-center gap-2 w-full h-10 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      Review & Submit to MD
                    </Link>
                    <button
                      type="button"
                      className="w-full h-10 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      Send Back for Correction
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
