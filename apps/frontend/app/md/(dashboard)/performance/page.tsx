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

// ============ DATA MODELS & MOCKS ============

interface FinanceDetails {
  revenueUsd: number;
  revenueLkr: number;
  gpLkr: number;
  gpMargin: number;
  otherIncome: number;
  personnelExpenses: number;
  adminExpenses: number;
  sellingExpenses: number;
  financeExpenses: number;
  depreciation: number;
  totalOverheads: number;
  provisions: number;
  exchangeGain: number; // or loss (negative)
  pbtBeforeNonOps: number;
  npMargin: number; // Net Profit Margin
  nonOpsExpenses: number;
  nonOpsIncome: number;
  pbtAfterNonOps: number;
  ebit: number;
  ebitda: number;
}

interface Company extends FinanceDetails {
  id: string;
  name: string;
  clusterId: string;
  fiscalYearStartMonth: 1 | 4; // 1 = Jan, 4 = Apr
  
  // High-level Metrics for Table
  monthActualPbt: number;
  monthBudgetPbt: number;
  monthAchievement: number;
  yearActualPbt: number; // YTD based on fiscal year
  yearBudgetPbt: number; // YTD based on fiscal year
  yearAchievement: number;

  uploadedBy: string;
  uploadedAt: string;
  lastUpdated: string;
}

interface Cluster {
  id: string;
  name: string;
  companies: Company[];
  
  // Aggregated Metrics
  monthActualPbt: number;
  monthBudgetPbt: number;
  monthAchievement: number;
  yearActualPbt: number;
  yearBudgetPbt: number;
  yearAchievement: number;
}

// Helpers
const formatCurrencyLKR = (val: number, compact = false) => {
  if (compact) {
    if (Math.abs(val) >= 1000000) return `LKR ${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `LKR ${(val / 1000).toFixed(0)}K`;
  }
  return `LKR ${val.toLocaleString()}`;
};
const formatLKR000 = (val: number) => val.toLocaleString(); // Just comma separated
const formatUSD = (val: number) => `USD ${val.toLocaleString()}`;
const formatPercent = (val: number) => `${val.toFixed(1)}%`;

// Mock Data Generator
const generateCompanyData = (id: string, name: string, clusterId: string, fiscalStart: 1 | 4): Company => {
  // Base PBT ~10m - 50m
  const basePbt = Math.floor(Math.random() * 40000000) + 10000000;
  
  // Granular details
  const revenueLkr = basePbt * 4;
  const gpLkr = revenueLkr * 0.4;
  const totalOverheads = gpLkr * 0.5;
  
  const personnelExpenses = totalOverheads * 0.4;
  const adminExpenses = totalOverheads * 0.3;
  const sellingExpenses = totalOverheads * 0.2;
  const financeExpenses = totalOverheads * 0.05;
  const depreciation = totalOverheads * 0.05;

  const pbtBeforeNonOps = gpLkr - totalOverheads;
  
  return {
    id, name, clusterId, fiscalYearStartMonth: fiscalStart,
    
    // Finance Details (Mocked for single month view)
    revenueUsd: revenueLkr / 300,
    revenueLkr,
    gpLkr,
    gpMargin: (gpLkr / revenueLkr) * 100,
    otherIncome: Math.floor(Math.random() * 500000),
    personnelExpenses,
    adminExpenses,
    sellingExpenses,
    financeExpenses,
    depreciation,
    totalOverheads,
    provisions: -50000,
    exchangeGain: 120000,
    pbtBeforeNonOps,
    npMargin: (pbtBeforeNonOps / revenueLkr) * 100,
    nonOpsExpenses: 0,
    nonOpsIncome: 0,
    pbtAfterNonOps: pbtBeforeNonOps, // Assuming simplified for mock
    ebit: pbtBeforeNonOps + financeExpenses,
    ebitda: pbtBeforeNonOps + financeExpenses + depreciation,

    // Table Metrics
    monthActualPbt: pbtBeforeNonOps / 12,
    monthBudgetPbt: (pbtBeforeNonOps / 12) * 0.9, // 110% achievement
    monthAchievement: 111.1,
    
    // Different YTD scaling based on fiscal start
    // If Jan start (1), and we act like it's Oct -> 10 months.
    // If Apr start (4), and we act like it's Oct -> 7 months.
    yearActualPbt: pbtBeforeNonOps * (fiscalStart === 1 ? 0.8 : 0.6), 
    yearBudgetPbt: (pbtBeforeNonOps * (fiscalStart === 1 ? 0.8 : 0.6)) * 0.95,
    yearAchievement: 105.2,

    uploadedBy: "Finance Officer",
    uploadedAt: "2025-10-15 14:30",
    lastUpdated: "v1.0"
  };
};

const aggregateCluster = (id: string, name: string, companies: Company[]): Cluster => {
  const sum = (key: keyof Company) => companies.reduce((acc, c) => acc + (c[key] as number), 0);
  
  const mAct = sum("monthActualPbt");
  const mBud = sum("monthBudgetPbt");
  const yAct = sum("yearActualPbt");
  const yBud = sum("yearBudgetPbt");

  return {
    id, name, companies,
    monthActualPbt: mAct,
    monthBudgetPbt: mBud,
    monthAchievement: mBud ? (mAct / mBud) * 100 : 0,
    yearActualPbt: yAct,
    yearBudgetPbt: yBud,
    yearAchievement: yBud ? (yAct / yBud) * 100 : 0,
  };
};

// FULL DATA SET
const rawClusters = [
  { id: "liner", name: "Liner", count: 2 },
  { id: "lube01", name: "Lube 01", count: 3 },
  { id: "gac", name: "GAC Group", count: 3 },
  { id: "shipping", name: "Shipping Services", count: 2 },
  { id: "shipsupply", name: "Ship Supply", count: 2 },
  { id: "property", name: "Property", count: 1 },
  { id: "warehouse", name: "Warehouse", count: 1 },
  { id: "manufacturing", name: "Manufacturing", count: 1 },
  { id: "hotel", name: "Hotel & Leisure", count: 1 },
  { id: "strategic", name: "Strategic Inv.", count: 1 },
  { id: "lube02", name: "Lube 02", count: 2 },
  { id: "bunkering", name: "Bunkering", count: 1 },
];

const clusters: Cluster[] = rawClusters.map(rc => {
  const companies = Array.from({ length: rc.count }).map((_, i) => 
    generateCompanyData(`${rc.id}-c${i+1}`, `${rc.name} Co. ${i+1}`, rc.id, i % 2 === 0 ? 1 : 4) // Alternate Jan/Apr fiscal
  );
  return aggregateCluster(rc.id, rc.name, companies);
});

const getAchievementColor = (achievement: number) => {
  return achievement >= 100 ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{company.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
               <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-medium">
                 Fiscal: {company.fiscalYearStartMonth === 1 ? "Jan-Dec" : "Apr-Mar"}
               </span>
               <span>•</span>
               <span>{monthName} {year}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* GROUP 1: Revenue & GP */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Revenue & Gross Profit</h4>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Revenue (USD)</span><span className="font-mono font-medium">{formatUSD(company.revenueUsd)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Revenue (LKR)</span><span className="font-mono font-medium">{formatCurrencyLKR(company.revenueLkr)}</span></div>
                  <div className="border-t border-slate-100 my-1" />
                  <div className="flex justify-between"><span className="text-slate-600 font-medium">Gross Profit (LKR)</span><span className="font-mono font-bold text-slate-800">{formatCurrencyLKR(company.gpLkr)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 italic">GP Margin</span><span className="font-mono text-slate-600">{formatPercent(company.gpMargin)}</span></div>
               </div>
            </div>

            {/* GROUP 2: Expenses */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Expenses Breakdown (LKR '000)</h4>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Personnel Related/HR</span><span className="font-mono">{formatLKR000(company.personnelExpenses)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Admin & Establishment</span><span className="font-mono">{formatLKR000(company.adminExpenses)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Selling & Distribution</span><span className="font-mono">{formatLKR000(company.sellingExpenses)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Finance Expenses</span><span className="font-mono">{formatLKR000(company.financeExpenses)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Depreciation</span><span className="font-mono">{formatLKR000(company.depreciation)}</span></div>
                  <div className="border-t border-slate-100 my-1" />
                  <div className="flex justify-between"><span className="text-slate-600 font-medium">Total Overheads</span><span className="font-mono font-bold text-red-600">-{formatLKR000(company.totalOverheads)}</span></div>
               </div>
            </div>

            {/* GROUP 3: Non-Ops & Provisions */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Other Items (LKR '000)</h4>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Other Income</span><span className="font-mono">{formatLKR000(company.otherIncome)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Provisions / Reversal</span><span className="font-mono">{formatLKR000(company.provisions)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Exchange (Loss) / Gain</span><span className={`font-mono ${company.exchangeGain >=0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatLKR000(company.exchangeGain)}</span></div>
                  <div className="border-t border-slate-100 my-1" />
                  <div className="flex justify-between"><span className="text-slate-600">Non Ops Income</span><span className="font-mono">{formatLKR000(company.nonOpsIncome)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Non Ops Expenses</span><span className="font-mono">{formatLKR000(company.nonOpsExpenses)}</span></div>
               </div>
            </div>

             {/* GROUP 4: Profitability */}
             <div className="bg-[#f8fafc] p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-[#0b1f3a] uppercase tracking-wide mb-4 border-b border-slate-200 pb-2">Key Profit Metrics (LKR '000)</h4>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center"><span className="text-slate-700 font-medium">EBITDA</span><span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-100">{formatLKR000(company.ebitda)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-700 font-medium">EBIT</span><span className="font-mono font-bold text-slate-900">{formatLKR000(company.ebit)}</span></div>
                  <div className="border-t border-slate-200 my-1" />
                  <div className="flex justify-between items-center"><span className="text-slate-700">PBT (Before Non-Ops)</span><span className="font-mono text-slate-900">{formatLKR000(company.pbtBeforeNonOps)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-700 font-bold bg-yellow-50 px-1">PBT (After Non-Ops)</span><span className="font-mono font-bold text-[#0b1f3a] text-lg">{formatLKR000(company.pbtAfterNonOps)}</span></div>
                  <div className="flex justify-between items-center mt-2"><span className="text-slate-500 text-xs italic">Net Profit Margin</span><span className="font-mono text-xs font-semibold">{formatPercent(company.npMargin)}</span></div>
               </div>
            </div>

          </div>
          
          {/* Metadata Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-6 text-xs text-slate-500">
             <div><span className="font-semibold text-slate-700">Uploaded By: </span>{company.uploadedBy}</div>
             <div><span className="font-semibold text-slate-700">Timestamp: </span>{company.uploadedAt}</div>
             <div><span className="font-semibold text-slate-700">Version: </span>{company.lastUpdated}</div>
          </div>
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
      if (filter === "positive") return c.monthActualPbt > 0;
      if (filter === "negative") return c.monthActualPbt < 0;
      return true;
    });
  }, [filter]);

  const sortedClusters = useMemo(() => 
    [...filteredClusters].sort((a, b) => b.monthActualPbt - a.monthActualPbt), [filteredClusters]);

  const chartData = useMemo(() => 
    sortedClusters.map(c => ({
      name: c.name.length > 10 ? c.name.substring(0, 8) + "..." : c.name,
      fullName: c.name,
      value: viewMode === "contribution" ? c.monthActualPbt : c.monthAchievement, 
      pbt: c.monthActualPbt,
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
            <div className="sticky top-0 bg-slate-50 z-10 flex border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider shadow-sm">
               <div className="flex-1 px-5 py-3">Cluster / Company</div>
               {/* Month Group */}
               <div className="hidden md:flex">
                  <div className="w-24 px-2 py-3 text-right bg-slate-100/50 border-l border-slate-200">M. Actual</div>
                  <div className="w-24 px-2 py-3 text-right bg-slate-100/50">M. Budget</div>
                  <div className="w-20 px-2 py-3 text-right bg-slate-100/50">M. Achv</div>
               </div>
               {/* Year Group */}
               <div className="hidden lg:flex">
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
                    <div className="hidden md:flex items-center bg-slate-50/30">
                       <div className="w-24 px-2 py-4 text-right border-l border-slate-100">
                          <span className="font-semibold text-slate-900 text-sm font-mono">{formatCurrencyLKR(cluster.monthActualPbt, true)}</span>
                       </div>
                       <div className="w-24 px-2 py-4 text-right">
                          <span className="text-slate-500 text-sm font-mono">{formatCurrencyLKR(cluster.monthBudgetPbt, true)}</span>
                       </div>
                       <div className="w-20 px-2 py-4 text-right">
                          <span className={`text-xs px-2 py-1 rounded font-bold font-mono ${getAchievementColor(cluster.monthAchievement)}`}>
                             {formatPercent(cluster.monthAchievement)}
                          </span>
                       </div>
                    </div>

                    {/* Year Metrics */}
                    <div className="hidden lg:flex items-center">
                       <div className="w-24 px-2 py-4 text-right border-l border-slate-100">
                          <span className="font-semibold text-slate-900 text-sm font-mono">{formatCurrencyLKR(cluster.yearActualPbt, true)}</span>
                       </div>
                       <div className="w-24 px-2 py-4 text-right">
                          <span className="text-slate-500 text-sm font-mono">{formatCurrencyLKR(cluster.yearBudgetPbt, true)}</span>
                       </div>
                       <div className="w-20 px-2 py-4 text-right">
                           <span className={`text-xs px-2 py-1 rounded font-bold font-mono ${getAchievementColor(cluster.yearAchievement)}`}>
                             {formatPercent(cluster.yearAchievement)}
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
                          className="flex items-center hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group bg-slate-50/10 relative"
                        >
                           {/* Blue Accent Strip */}
                           <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1e40af] opacity-50" />

                           <div className="flex-1 px-5 py-3 pl-8 min-w-0">
                              <div className="flex items-center gap-2 pl-2">
                                 <span className="text-sm font-medium text-slate-600 group-hover:text-[#0b1f3a] truncate">{company.name}</span>
                                 <ArrowUpRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                           </div>

                           {/* Month Metrics */}
                           <div className="hidden md:flex items-center bg-slate-50/30">
                              <div className="w-24 px-2 py-3 text-right border-l border-slate-100">
                                 <span className="text-sm text-slate-700 font-mono font-medium">{formatCurrencyLKR(company.monthActualPbt, true)}</span>
                              </div>
                              <div className="w-24 px-2 py-3 text-right">
                                 <span className="text-slate-400 text-xs font-mono">{formatCurrencyLKR(company.monthBudgetPbt, true)}</span>
                              </div>
                              <div className="w-20 px-2 py-3 text-right">
                                  <span className={`text-xs font-bold font-mono ${company.monthAchievement >= 100 ? "text-emerald-700" : "text-red-700"}`}>
                                    {formatPercent(company.monthAchievement)}
                                  </span>
                              </div>
                           </div>

                           {/* Year Metrics */}
                           <div className="hidden lg:flex items-center">
                              <div className="w-24 px-2 py-3 text-right border-l border-slate-100">
                                 <span className="text-sm text-slate-700 font-mono font-medium">{formatCurrencyLKR(company.yearActualPbt, true)}</span>
                              </div>
                              <div className="w-24 px-2 py-3 text-right">
                                 <span className="text-slate-400 text-xs font-mono">{formatCurrencyLKR(company.yearBudgetPbt, true)}</span>
                              </div>
                              <div className="w-20 px-2 py-3 text-right">
                                 <span className={`text-xs font-bold font-mono ${company.yearAchievement >= 100 ? "text-emerald-700" : "text-red-700"}`}>
                                    {formatPercent(company.yearAchievement)}
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
