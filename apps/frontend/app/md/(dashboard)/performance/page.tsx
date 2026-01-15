"use client";

import { useState, useMemo } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Building2,
  Filter,
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ComposedChart,
  Line,
  Area,
} from "recharts";

// ============ DATA ============

interface Company {
  id: string;
  name: string;
  monthActual: number;
  monthBudget: number;
  monthAchievement: number;
  yearActual: number;
  yearBudget: number;
  yearAchievement: number;
  uploadedBy: string;
  uploadedAt: string;
  lastUpdated: string;
}

interface Cluster {
  id: string;
  name: string;
  monthActual: number;
  monthBudget: number;
  monthAchievement: number;
  yearActual: number;
  yearBudget: number;
  yearAchievement: number;
  companies: Company[];
}

// Helper to generate mock financial data
const generateFinancials = (base: number) => {
  const monthActual = Math.floor(base / 12);
  const monthBudget = Math.floor(monthActual * 0.95);
  const yearActual = base;
  const yearBudget = Math.floor(base * 0.95);
  
  return {
    monthActual,
    monthBudget,
    monthAchievement: (monthActual / monthBudget) * 100,
    yearActual,
    yearBudget,
    yearAchievement: (yearActual / yearBudget) * 100,
  };
};

const clusters: Cluster[] = [
  {
    id: "liner", name: "Liner", ...generateFinancials(1258000),
    companies: [
      { id: "c1", name: "Liner Shipping", ...generateFinancials(850000), uploadedBy: "John Doe", uploadedAt: "2025-10-15 10:30 AM", lastUpdated: "v1.2" },
      { id: "c2", name: "Liner Logistics", ...generateFinancials(408000), uploadedBy: "Jane Smith", uploadedAt: "2025-10-14 02:15 PM", lastUpdated: "v1.1" },
    ]
  },
  {
    id: "lube01", name: "Lube 01", ...generateFinancials(1146000),
    companies: [
      { id: "c3", name: "MLL-Automotive", ...generateFinancials(580000), uploadedBy: "Mike Brown", uploadedAt: "2025-10-15 09:45 AM", lastUpdated: "v1.0" },
      { id: "c4", name: "MLL-Industrial", ...generateFinancials(310000), uploadedBy: "Sarah Lee", uploadedAt: "2025-10-15 11:00 AM", lastUpdated: "v1.0" },
      { id: "c5", name: "Mckupler", ...generateFinancials(153600), uploadedBy: "John Doe", uploadedAt: "2025-10-14 04:30 PM", lastUpdated: "v1.1" },
      { id: "c6", name: "3M Distribution", ...generateFinancials(102400), uploadedBy: "Jane Smith", uploadedAt: "2025-10-15 08:30 AM", lastUpdated: "v1.0" },
    ]
  },
  {
    id: "gac", name: "GAC Group", ...generateFinancials(1097000),
    companies: [
      { id: "c8", name: "GSL", ...generateFinancials(510000), uploadedBy: "Global Finance", uploadedAt: "2025-10-16 09:00 AM", lastUpdated: "v2.0" },
      { id: "c9", name: "MSL", ...generateFinancials(375000), uploadedBy: "Global Finance", uploadedAt: "2025-10-16 09:15 AM", lastUpdated: "v2.0" },
      { id: "c10", name: "GAC Tug", ...generateFinancials(347000), uploadedBy: "Global Finance", uploadedAt: "2025-10-16 09:30 AM", lastUpdated: "v2.0" },
    ]
  },
   {
    id: "shipping", name: "Shipping Services", ...generateFinancials(970000),
    companies: [
      { id: "c13", name: "MSS Shipping", ...generateFinancials(780000), uploadedBy: "Shipping Team", uploadedAt: "2025-10-15 02:45 PM", lastUpdated: "v1.0" },
      { id: "c14", name: "MMA Training", ...generateFinancials(190000), uploadedBy: "Shipping Team", uploadedAt: "2025-10-15 03:00 PM", lastUpdated: "v1.0" },
    ]
  },
  // ... other clusters would be similar, simplifying for brevity
];

const formatCurrency = (num: number) => {
  if (Math.abs(num) >= 1000000) return `LKR ${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `LKR ${(num / 1000).toFixed(0)}K`;
  return `LKR ${num.toLocaleString()}`;
};

const formatPercent = (num: number) => `${num.toFixed(1)}%`;

const getAchievementColor = (achievement: number) => {
  if (achievement >= 100) return "text-emerald-600 bg-emerald-50";
  if (achievement >= 90) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
};

// ============ COMPONENTS ============

interface FinanceUploadModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  monthName: string;
  year: number;
}

const FinanceUploadModal = ({ company, isOpen, onClose, monthName, year }: FinanceUploadModalProps) => {
  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{company.name}</h3>
            <p className="text-sm text-slate-500">Finance Upload Details — {monthName} {year}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* 1. Period & Status Info */}
          <div className="flex items-center gap-4 mb-6 text-sm">
            <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
              Period: {monthName} {year}
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
              Status: Approved
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 2. Uploaded Values (Raw) */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Uploaded Values (Raw)</h4>
              
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Actual PBT</span>
                    <span className="text-slate-900 font-bold font-mono">{company.monthActual.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Budget PBT</span>
                    <span className="text-slate-900 font-bold font-mono">{company.monthBudget.toLocaleString()}</span>
                 </div>
                  <div className="w-full h-px bg-slate-200 my-2" />
                 <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Revenue</span>
                    <span className="text-slate-400 italic">--</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Direct Costs</span>
                    <span className="text-slate-400 italic">--</span>
                 </div>
              </div>
            </div>

            {/* 3. Derived Metrics */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Derived Performance</h4>

              <div className="grid grid-cols-2 gap-3">
                 <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">Achievement</p>
                    <p className={`text-xl font-bold ${company.monthAchievement >= 100 ? "text-emerald-600" : "text-red-600"}`}>
                      {company.monthAchievement.toFixed(1)}%
                    </p>
                 </div>
                 <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">Variance</p>
                    <p className={`text-xl font-bold ${company.monthActual >= company.monthBudget ? "text-emerald-600" : "text-red-600"}`}>
                      {(company.monthActual - company.monthBudget).toLocaleString()}
                    </p>
                 </div>
              </div>

               <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-600 mb-1 font-medium">Year To Date (YTD)</p>
                  <div className="flex justify-between items-end">
                    <div>
                       <span className="text-slate-500 text-xs">Actual: </span>
                       <span className="font-semibold text-slate-900">{formatCurrency(company.yearActual)}</span>
                    </div>
                     <span className={`text-sm font-bold ${company.yearAchievement >= 100 ? "text-emerald-600" : "text-red-600"}`}>
                        {company.yearAchievement.toFixed(1)}%
                     </span>
                  </div>
               </div>
            </div>
          </div>

          {/* 4. Audit / Metadata */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
               <span className="font-semibold text-slate-700">Uploaded By:</span>
               <span>{company.uploadedBy}</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="font-semibold text-slate-700">Timestamp:</span>
               <span>{company.uploadedAt}</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="font-semibold text-slate-700">Version:</span>
               <span>{company.lastUpdated}</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="font-semibold text-slate-700">Ref ID:</span>
               <span className="font-mono">F-2025-10-{company.id}</span>
            </div>
          </div>

        </div>
        
        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
           <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
              Close
           </button>
           <button className="px-4 py-2 bg-[#0b1f3a] text-white rounded-lg text-sm font-medium hover:bg-[#1a2f4d] transition-colors shadow-sm">
              View Full Report
           </button>
        </div>
      </div>
    </div>
  );
};

export default function PerformancePage() {
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"contribution" | "momentum">("contribution");
  const [filter, setFilter] = useState<"all" | "positive" | "negative">("all");

  // Modal State
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Period selection
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // October
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  
  const availableMonths = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
  ];
  const availableYears = [2024, 2025, 2026];
  const selectedMonthName = availableMonths.find(m => m.value === selectedMonth)?.label || "October";

  const filteredClusters = useMemo(() => {
    return clusters.filter(c => {
      if (filter === "positive") return c.monthActual > 0;
      if (filter === "negative") return c.monthActual < 0;
      return true;
    });
  }, [filter]);

  const sortedClusters = useMemo(() => 
    [...filteredClusters].sort((a, b) => b.monthActual - a.monthActual), [filteredClusters]);

  const chartData = useMemo(() => 
    sortedClusters.map(c => ({
      name: c.name.length > 10 ? c.name.substring(0, 8) + "..." : c.name,
      fullName: c.name,
      value: viewMode === "contribution" ? c.monthActual : c.monthAchievement, // Reusing chart for now with different metrics
      pbt: c.monthActual,
      momentum: "stable", // Placeholder
    })), [sortedClusters, viewMode]);

  const toggleCluster = (clusterId: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cluster → Company Drilldown</h1>
            <p className="text-sm text-slate-500 mt-1">Analyze performance drivers from Cluster to Company level</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Month Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-9 px-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 focus:border-[#0b1f3a]"
              >
                {availableMonths.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-9 px-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 focus:border-[#0b1f3a]"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">View:</span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("contribution")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === "contribution" ? "bg-[#0b1f3a] text-white" : "text-slate-600"
                }`}
              >
                Contribution %
              </button>
              <button
                onClick={() => setViewMode("momentum")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === "momentum" ? "bg-[#0b1f3a] text-white" : "text-slate-600"
                }`}
              >
                MoM Change
              </button>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "positive" | "negative")}
              className="h-8 px-3 text-sm border border-slate-200 rounded-lg"
            >
              <option value="all">All Clusters</option>
              <option value="positive">Profitable Only</option>
              <option value="negative">Loss-making Only</option>
            </select>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            {viewMode === "contribution" ? "Cluster Contribution to Group PBT" : "Month-over-Month Momentum"}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }} 
                  angle={-45} 
                  textAnchor="end" 
                  height={70} 
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toFixed(1)}%`,
                    viewMode === "contribution" ? "Contribution" : "MoM Change"
                  ]}
                  labelFormatter={(label, payload: any) => payload?.[0]?.payload?.fullName || label}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.value >= 0 ? "#0b1f3a" : "#ef4444"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hierarchical List: Cluster → Company */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Performance Hierarchy</h3>
            <p className="text-xs text-slate-500 mt-0.5">Click cluster row to expand companies</p>
          </div>
          
          <div className="divide-y divide-slate-100">
            {/* STICKY HEADER for Metrics */}
            <div className="sticky top-0 bg-slate-50 z-10 flex border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
               <div className="flex-1 px-5 py-3">Cluster / Company</div>
               {/* Month Group */}
               <div className="flex">
                  <div className="w-24 px-2 py-3 text-right bg-slate-100/50 border-l border-slate-200">M. Actual</div>
                  <div className="w-24 px-2 py-3 text-right bg-slate-100/50">M. Budget</div>
                  <div className="w-20 px-2 py-3 text-right bg-slate-100/50">M. Achv</div>
               </div>
               {/* Year Group */}
               <div className="flex">
                  <div className="w-24 px-2 py-3 text-right border-l border-slate-200">Y. Actual</div>
                  <div className="w-24 px-2 py-3 text-right">Y. Budget</div>
                  <div className="w-20 px-2 py-3 text-right">Y. Achv</div>
               </div>
            </div>

            {sortedClusters.map((cluster) => {
              const isExpanded = expandedClusters.has(cluster.id);
              
              return (
                <div key={cluster.id}>
                  {/* Cluster Row */}
                  <div
                    onClick={() => toggleCluster(cluster.id)}
                    className={`flex items-center cursor-pointer transition-colors border-l-4 ${
                      isExpanded ? "bg-slate-50 border-l-[#0b1f3a]" : "hover:bg-slate-50 border-l-transparent"
                    }`}
                  >
                    <div className="flex-1 px-5 py-4 min-w-0">
                      <div className="flex items-center gap-3">
                         {isExpanded ? 
                           <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" /> : 
                           <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                         }
                         <Building2 className="h-4 w-4 text-[#0b1f3a] flex-shrink-0" />
                         <span className="font-bold text-slate-900 truncate">{cluster.name}</span>
                      </div>
                    </div>

                    {/* Month Metrics */}
                    <div className="flex items-center bg-slate-50/30">
                       <div className="w-24 px-2 py-4 text-right border-l border-slate-100">
                          <span className="font-semibold text-slate-900">{formatCurrency(cluster.monthActual)}</span>
                       </div>
                       <div className="w-24 px-2 py-4 text-right">
                          <span className="text-slate-500 text-sm">{formatCurrency(cluster.monthBudget)}</span>
                       </div>
                       <div className="w-20 px-2 py-4 text-right">
                          <span className={`text-xs px-2 py-1 rounded font-bold ${getAchievementColor(cluster.monthAchievement)}`}>
                             {cluster.monthAchievement.toFixed(0)}%
                          </span>
                       </div>
                    </div>

                    {/* Year Metrics */}
                    <div className="flex items-center">
                       <div className="w-24 px-2 py-4 text-right border-l border-slate-100">
                          <span className="font-semibold text-slate-900">{formatCurrency(cluster.yearActual)}</span>
                       </div>
                       <div className="w-24 px-2 py-4 text-right">
                          <span className="text-slate-500 text-sm">{formatCurrency(cluster.yearBudget)}</span>
                       </div>
                       <div className="w-20 px-2 py-4 text-right">
                           <span className={`text-xs px-2 py-1 rounded font-bold ${getAchievementColor(cluster.yearAchievement)}`}>
                             {cluster.yearAchievement.toFixed(0)}%
                          </span>
                       </div>
                    </div>
                  </div>
                  
                  {/* Company Rows (expanded) */}
                  {isExpanded && (
                    <div className="bg-white border-t border-slate-100">
                      {cluster.companies.map((company) => (
                        <div 
                          key={company.id}
                          onClick={() => handleCompanyClick(company)}
                          className="flex items-center hover:bg-blue-50/50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group"
                        >
                           <div className="flex-1 px-5 py-3 pl-12 min-w-0">
                              <div className="flex items-center gap-2">
                                 <div className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-[#0b1f3a]" />
                                 <span className="text-sm font-medium text-slate-600 group-hover:text-[#0b1f3a] truncate">{company.name}</span>
                                 <ArrowUpRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                           </div>

                           {/* Month Metrics */}
                           <div className="flex items-center bg-slate-50/30">
                              <div className="w-24 px-2 py-3 text-right border-l border-slate-100">
                                 <span className="text-sm font-semibold text-slate-800">{formatCurrency(company.monthActual)}</span>
                              </div>
                              <div className="w-24 px-2 py-3 text-right">
                                 <span className="text-slate-400 text-xs">{formatCurrency(company.monthBudget)}</span>
                              </div>
                              <div className="w-20 px-2 py-3 text-right">
                                  <span className={`text-xs font-semibold ${company.monthAchievement >= 100 ? "text-emerald-600" : "text-red-500"}`}>
                                    {company.monthAchievement.toFixed(1)}%
                                  </span>
                              </div>
                           </div>

                           {/* Year Metrics */}
                           <div className="flex items-center">
                              <div className="w-24 px-2 py-3 text-right border-l border-slate-100">
                                 <span className="text-sm font-semibold text-slate-800">{formatCurrency(company.yearActual)}</span>
                              </div>
                              <div className="w-24 px-2 py-3 text-right">
                                 <span className="text-slate-400 text-xs">{formatCurrency(company.yearBudget)}</span>
                              </div>
                              <div className="w-20 px-2 py-3 text-right">
                                 <span className={`text-xs font-semibold ${company.yearAchievement >= 100 ? "text-emerald-600" : "text-red-500"}`}>
                                    {company.yearAchievement.toFixed(1)}%
                                 </span>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Finance Upload Details Modal */}
      <FinanceUploadModal 
        company={selectedCompany} 
        isOpen={isModalOpen} 
        onClose={closeModal}
        monthName={selectedMonthName}
        year={selectedYear}
      />
    </div>
  );
}
