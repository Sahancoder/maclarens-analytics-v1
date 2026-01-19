"use client";

import { useState, useMemo } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  Building2,
  Filter,
  CheckCircle2,
  Plus,
  X,
  Check,
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
  LineChart,
  Area,
  Legend,
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
  
  // YTD Data Container (Mirrors root FinanceDetails)
  ytd: FinanceDetails;
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



// Mock Series generator for Trend Chart
const getPbdtSeries = (companyId: string) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const baseValue = Math.floor(Math.random() * 40000000) + 10000000; 
  
  return months.map(m => ({
    month: m,
    value: baseValue + Math.floor(Math.random() * 10000000) - 5000000
  }));
};
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
    lastUpdated: "v1.0",
    
    // Mock YTD Data (Multiplying monthly by duration for simulation)
    ytd: {
      revenueUsd: (revenueLkr / 300) * (fiscalStart === 1 ? 10 : 7),
      revenueLkr: revenueLkr * (fiscalStart === 1 ? 10 : 7),
      gpLkr: gpLkr * (fiscalStart === 1 ? 10 : 7),
      gpMargin: (gpLkr / revenueLkr) * 100, // Margin typically stays similar or weighted avg
      otherIncome: Math.floor(Math.random() * 500000) * (fiscalStart === 1 ? 10 : 7),
      personnelExpenses: personnelExpenses * (fiscalStart === 1 ? 10 : 7),
      adminExpenses: adminExpenses * (fiscalStart === 1 ? 10 : 7),
      sellingExpenses: sellingExpenses * (fiscalStart === 1 ? 10 : 7),
      financeExpenses: financeExpenses * (fiscalStart === 1 ? 10 : 7),
      depreciation: depreciation * (fiscalStart === 1 ? 10 : 7),
      totalOverheads: totalOverheads * (fiscalStart === 1 ? 10 : 7),
      provisions: -50000 * (fiscalStart === 1 ? 10 : 7),
      exchangeGain: 120000 * (fiscalStart === 1 ? 10 : 7),
      pbtBeforeNonOps: pbtBeforeNonOps * (fiscalStart === 1 ? 10 : 7),
      npMargin: (pbtBeforeNonOps / revenueLkr) * 100,
      nonOpsExpenses: 0,
      nonOpsIncome: 0,
      pbtAfterNonOps: pbtBeforeNonOps * (fiscalStart === 1 ? 10 : 7),
      ebit: (pbtBeforeNonOps + financeExpenses) * (fiscalStart === 1 ? 10 : 7),
      ebitda: (pbtBeforeNonOps + financeExpenses + depreciation) * (fiscalStart === 1 ? 10 : 7),
    }
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

// Mock Comment Data Service
interface Comment {
  id: string;
  authorRole: 'FINANCE_OFFICER' | 'SYSTEM_ADMIN' | 'FINANCE_DIRECTOR'; 
  authorName: string;
  message: string;
  reviewedAt: string;
}

const getApprovedComments = (companyId: string): Comment[] => {
  // Simulating fetching only FD Approved comments
  return [
    {
      id: "c1",
      authorRole: "FINANCE_OFFICER",
      authorName: "Sahan Hettiarachchi",
      message: "Revenue increase driven by higher volume in Q3. Operational costs were kept within budget despite fuel price volatility.",
      reviewedAt: "Oct 16, 2025 • 10:45 AM"
    },
    {
      id: "c2",
      authorRole: "SYSTEM_ADMIN",
      authorName: "System",
      message: "Budget variance aligned with revised forecast v2. No significant anomalies detected in overhead allocation.",
      reviewedAt: "Oct 16, 2025 • 10:48 AM"
    }
  ];
};

// ============ SUB-COMPONENTS ============

// --- Multi-Select Component ---
interface MultiSelectProps {
  options: Company[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  colors: Record<string, string>;
}

const MultiSelect = ({ options, selectedIds, onChange, colors }: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing dropdown
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length >= 5) return; // Limit to 5
      onChange([...selectedIds, id]);
    }
  };

  const removeOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(i => i !== id));
  };

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[32px] pl-2 pr-8 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:border-slate-300 cursor-pointer flex flex-wrap gap-1 items-center min-w-[200px]"
      >
        {selectedIds.length === 0 && <span className="text-slate-500">Select companies...</span>}
        {selectedIds.map(id => {
          const company = options.find(o => o.id === id);
          if (!company) return null;
          return (
            <span 
              key={id} 
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[id] }} />
              <span className="max-w-[80px] truncate">{company.name}</span>
              <X 
                className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" 
                onClick={(e) => removeOption(id, e)}
              />
            </span>
          );
        })}
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-1 w-full min-w-[240px] bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-[300px] overflow-y-auto">
            {options.map(option => {
              const isSelected = selectedIds.includes(option.id);
              const isDisabled = !isSelected && selectedIds.length >= 5;
              
              return (
                <div
                  key={option.id}
                  onClick={(e) => !isDisabled && toggleOption(option.id, e)}
                  className={`px-3 py-2 flex items-center justify-between text-xs cursor-pointer ${
                    isDisabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? "bg-[#0b1f3a] border-[#0b1f3a]" : "border-slate-300 bg-white"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-slate-700">{option.name}</span>
                  </div>
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[option.id] }} />
                  )}
                </div>
              );
            })}
            {options.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">No companies available</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};


interface FinanceUploadModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  monthName: string;
  year: number;
}

const FinanceUploadModal = ({ company, isOpen, onClose, monthName, year }: FinanceUploadModalProps) => {
  if (!isOpen || !company) return null;

  // Calculate YTD Range Logic
  const getYtdRangeLabel = () => {
    // Current assumption: Selected month is calculated from outside (Oct 2025)
    // Fiscal Start: 1 (Jan) or 4 (Apr)
    
    const monthIndex = 10; // October (1-indexed for logic clarity)
    const fiscalStart = company.fiscalYearStartMonth;
    let startMonthName = "";
    let duration = 0;
    
    if (fiscalStart === 1) {
      startMonthName = "Jan";
      duration = monthIndex; // Jan to Oct = 10 months
    } else {
      startMonthName = "Apr";
      // If Oct (10) >= Apr (4), simple diff
      duration = monthIndex - fiscalStart + 1; // 10 - 4 + 1 = 7 months
    }
    
    return {
      label: `${startMonthName}–${monthName.substring(0, 3)} ${year}`,
      duration
    };
  };

  const ytdInfo = getYtdRangeLabel();
  
  // Helper for 3-col Grid Row
  // Helper for 3-col Grid Row with better visual separation
  const GridRow = ({ label, monthly, ytd, isBold = false, isHeader = false, isAccent = false, isNegative = false }: any) => {
    if (isHeader) {
      return (
        <div className="grid grid-cols-[1fr_140px_140px] items-center border-b-2 border-slate-100 pb-2 mb-2">
           <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">{label || "Metric"}</div>
           <div className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-3 border-l border-slate-100">Monthly</div>
           <div className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-3 border-l border-slate-100">YTD</div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-[1fr_140px_140px] items-center py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 rounded-sm">
         <div className={`pl-2 pr-4 ${isBold ? 'font-semibold text-slate-800' : 'text-slate-600 font-medium'} text-sm`}>
           {label}
         </div>
         
         {/* Monthly Value */}
         <div className={`text-right px-3 border-l border-slate-100 font-mono text-sm tracking-tight
           ${isBold ? 'font-bold' : 'font-medium'} 
           ${isNegative ? 'text-red-600' : (isAccent ? 'text-[#0b1f3a]' : 'text-slate-700')}
         `}>
           {monthly}
         </div>
         
         {/* YTD Value */}
         <div className={`text-right px-3 border-l border-slate-100 font-mono text-sm tracking-tight
           ${isBold ? 'font-bold' : 'font-medium'} 
           ${isNegative ? 'text-red-600' : (isAccent ? 'text-[#0b1f3a]' : 'text-slate-700')}
           bg-slate-50/50 -my-2.5 py-2.5
         `}>
           {ytd}
         </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{company.name}</h3>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-1 text-xs text-slate-500">
               <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-medium">
                 Fiscal: {company.fiscalYearStartMonth === 1 ? "Jan-Dec" : "Apr-Mar"}
               </span>
               <span className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                 <span className="font-semibold text-slate-700">Monthly:</span> {monthName} {year}
               </span>
               <span className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                 <span className="font-semibold text-slate-700">YTD:</span> {ytdInfo.label} ({ytdInfo.duration} Mo.)
               </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* GROUP 1: Revenue & GP */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Revenue & Gross Profit</h4>
               <div className="space-y-1">
                  <GridRow isHeader label="" monthly="Monthly" ytd="YTD" />
                  <GridRow label="Revenue (USD)" monthly={formatLKR000(company.revenueUsd)} ytd={formatLKR000(company.ytd.revenueUsd)} />
                  <GridRow label="Revenue (LKR)" monthly={formatCurrencyLKR(company.revenueLkr)} ytd={formatCurrencyLKR(company.ytd.revenueLkr)} />
                  <div className="border-t border-slate-100 my-2" />
                  <GridRow label="Gross Profit (LKR)" isBold monthly={formatCurrencyLKR(company.gpLkr)} ytd={formatCurrencyLKR(company.ytd.gpLkr)} />
                  <GridRow label="GP Margin" monthly={formatPercent(company.gpMargin)} ytd={formatPercent(company.ytd.gpMargin)} />
               </div>
            </div>

            {/* GROUP 2: Expenses */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Expenses Breakdown (LKR)</h4>
               <div className="space-y-1">
                  <GridRow isHeader label="" monthly="Monthly" ytd="YTD" />
                  <GridRow label="Personnel Related/HR" monthly={formatLKR000(company.personnelExpenses)} ytd={formatLKR000(company.ytd.personnelExpenses)} />
                  <GridRow label="Admin & Establishment" monthly={formatLKR000(company.adminExpenses)} ytd={formatLKR000(company.ytd.adminExpenses)} />
                  <GridRow label="Selling & Distribution" monthly={formatLKR000(company.sellingExpenses)} ytd={formatLKR000(company.ytd.sellingExpenses)} />
                  <GridRow label="Finance Expenses" monthly={formatLKR000(company.financeExpenses)} ytd={formatLKR000(company.ytd.financeExpenses)} />
                  <GridRow label="Depreciation" monthly={formatLKR000(company.depreciation)} ytd={formatLKR000(company.ytd.depreciation)} />
                  <div className="border-t border-slate-100 my-2" />
                  <GridRow label="Total Overheads" isBold isNegative monthly={`-${formatLKR000(company.totalOverheads)}`} ytd={`-${formatLKR000(company.ytd.totalOverheads)}`} />
               </div>
            </div>

            {/* GROUP 3: Non-Ops & Provisions */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Other Items (LKR)</h4>
               <div className="space-y-1">
                  <GridRow isHeader label="" monthly="Monthly" ytd="YTD" />
                  <GridRow label="Other Income" monthly={formatLKR000(company.otherIncome)} ytd={formatLKR000(company.ytd.otherIncome)} />
                  <GridRow label="Provisions / Reversal" monthly={formatLKR000(company.provisions)} ytd={formatLKR000(company.ytd.provisions)} />
                  <GridRow label="Exchange (Loss) / Gain" monthly={formatLKR000(company.exchangeGain)} ytd={formatLKR000(company.ytd.exchangeGain)} />
                  <div className="border-t border-slate-100 my-2" />
                  <GridRow label="Non Ops Income" monthly={formatLKR000(company.nonOpsIncome)} ytd={formatLKR000(company.ytd.nonOpsIncome)} />
                  <GridRow label="Non Ops Expenses" monthly={formatLKR000(company.nonOpsExpenses)} ytd={formatLKR000(company.ytd.nonOpsExpenses)} />
               </div>
            </div>

             {/* GROUP 4: Profitability */}
             <div className="bg-[#f8fafc] p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-[#0b1f3a] uppercase tracking-wide mb-4 border-b border-slate-200 pb-2">Key Profit Metrics (LKR)</h4>
               <div className="space-y-1">
                  <GridRow isHeader label="" monthly="Monthly" ytd="YTD" />
                  <GridRow label="EBITDA" isBold monthly={formatLKR000(company.ebitda)} ytd={formatLKR000(company.ytd.ebitda)} />
                  <GridRow label="EBIT" isBold monthly={formatLKR000(company.ebit)} ytd={formatLKR000(company.ytd.ebit)} />
                  <div className="border-t border-slate-200 my-2" />
                  <GridRow label="PBT (Before Non-Ops)" monthly={formatLKR000(company.pbtBeforeNonOps)} ytd={formatLKR000(company.ytd.pbtBeforeNonOps)} />
                  <GridRow label="PBT (After Non-Ops)" isBold isAccent monthly={formatLKR000(company.pbtAfterNonOps)} ytd={formatLKR000(company.ytd.pbtAfterNonOps)} />
                  <GridRow label="Net Profit Margin" monthly={formatPercent(company.npMargin)} ytd={formatPercent(company.ytd.npMargin)} />
               </div>
            </div>


            {/* GROUP 5: FD Approved Comments */}
            <div className="md:col-span-2 mt-2">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                   <h4 className="text-sm font-bold text-[#0b1f3a] uppercase tracking-wide flex items-center gap-2">
                     <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                     Finance Director Reviewed & Approved Comments
                   </h4>
                   <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                     Verified
                   </span>
                </div>
                <div className="p-5 space-y-4">
                  {getApprovedComments(company.id).map((comment) => (
                    <div key={comment.id} className="relative pl-4 border-l-2 border-slate-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-800">{comment.authorRole === 'FINANCE_OFFICER' ? 'Finance Officer' : 'System Admin'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">{comment.reviewedAt}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed italic">
                        "{comment.message}"
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                         <div className="h-4 w-4 rounded-full bg-purple-100 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                         </div>
                         <span className="text-[10px] font-medium text-purple-700 uppercase tracking-wide">Approved by Finance Director</span>
                      </div>
                    </div>
                  ))}
                </div>
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
      // Basic mock filtering logic if needed (can be removed if chart doesn't use it)
      return true;
    });
  }, []); // removed filter dependency as filter state is removed

  const sortedClusters = useMemo(() => 
    [...filteredClusters].sort((a, b) => b.monthActualPbt - a.monthActualPbt), [filteredClusters]);

  // Drilldown State
  const [drilldownClusterId, setDrilldownClusterId] = useState<string>(clusters[0]?.id || "");
  const [drilldownCompanyIds, setDrilldownCompanyIds] = useState<string[]>([]);
  const [drilldownTimeRange, setDrilldownTimeRange] = useState<"6M" | "12M">("12M");

  // Colors for multi-selection (Fixed order: Blue, Green, Red, Purple, Orange)
  const COLOR_PALETTE = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c"];
  
  // Assign colors to selected companies based on order
  const companyColors = useMemo(() => {
    const colors: Record<string, string> = {};
    drilldownCompanyIds.forEach((id, index) => {
      colors[id] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    return colors;
  }, [drilldownCompanyIds]);

  // Initialize companies when cluster changes
  useMemo(() => {
    const cluster = clusters.find(c => c.id === drilldownClusterId);
    if (cluster && cluster.companies.length > 0) {
      // Logic: If previously selected companies are NOT in the new cluster, reset selection.
      // If we want to auto-select the first 1 or 2 companies, we can do that here.
      // For now, let's auto-select the first 2 companies for a quick view.
      const firstTwo = cluster.companies.slice(0, 2).map(c => c.id);
      
      // Check if current selection is valid for this cluster
      const allExist = drilldownCompanyIds.every(id => cluster.companies.find(c => c.id === id));
      
      if (!allExist || drilldownCompanyIds.length === 0) {
         setDrilldownCompanyIds(firstTwo);
      }
    } else {
      setDrilldownCompanyIds([]);
    }
  }, [drilldownClusterId]); // Deliberately limited deps to prevent cycles

  // Derive Drilldown Data - Multi Series
  const drilldownData = useMemo(() => {
    if (drilldownCompanyIds.length === 0) return [];
    
    // We need to merge series from multiple companies into a single array of objects:
    // [{ month: "Jan", company1: 100, company2: 120 }, ...]

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Generate data for each company
    const companiesData = drilldownCompanyIds.map(id => {
       return { id, series: getPbdtSeries(id) };
    });

    const mergedData = months.map(month => {
       const row: any = { month };
       companiesData.forEach(cd => {
          const point = cd.series.find(s => s.month === month);
          if (point) {
             row[cd.id] = point.value;
          }
       });
       return row;
    });
    
    // Filter by time range
    if (drilldownTimeRange === "6M") {
      return mergedData.slice(-6);
    }
    return mergedData;
  }, [drilldownCompanyIds, drilldownTimeRange]);

  const availableDrilldownCompanies = useMemo(() => {
    const c = clusters.find(cl => cl.id === drilldownClusterId);
    return c ? c.companies : [];
  }, [drilldownClusterId]);

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

        {/* Controls & Chart Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
             <div>
                <h3 className="text-base font-semibold text-slate-900">Cluster Drilldown</h3>
                <p className="text-xs text-slate-500 mt-0.5">Company PBT Trend</p>
             </div>

             <div className="flex flex-wrap items-center gap-3">
                {/* Cluster Select */}
                <div className="relative">
                  <select
                    value={drilldownClusterId}
                    onChange={(e) => {
                      setDrilldownClusterId(e.target.value);
                      // Reset companies will be handled by useMemo effect
                    }}
                    className="h-8 pl-3 pr-8 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 appearance-none min-w-[140px]"
                  >
                    {clusters.map(cluster => (
                      <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Multi-Select Company Dropdown */}
                <div className="min-w-[220px] max-w-[400px]">
                  <MultiSelect 
                    options={availableDrilldownCompanies}
                    selectedIds={drilldownCompanyIds}
                    onChange={setDrilldownCompanyIds}
                    colors={companyColors}
                  />
                </div>

                <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block"></div>

                {/* Time Range Toggle */}
                 <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setDrilldownTimeRange("6M")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      drilldownTimeRange === "6M" ? "bg-white text-[#0b1f3a] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Last 6M
                  </button>
                  <button
                    onClick={() => setDrilldownTimeRange("12M")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      drilldownTimeRange === "12M" ? "bg-white text-[#0b1f3a] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    12M
                  </button>
                </div>
             </div>
          </div>

          <div className="p-5">
            <div className="h-[380px] w-full">
              {drilldownCompanyIds.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={drilldownData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#64748b" 
                        tick={{ fontSize: 11 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#64748b"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => {
                           if (value >= 1000000) return `LKR ${(value / 1000000).toFixed(1)}M`;
                           return `LKR ${(value / 1000).toFixed(0)}K`;
                        }}
                        axisLine={false}
                        tickLine={false}
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px' 
                        }}
                        itemStyle={{ fontWeight: 600 }}
                        formatter={(value: number, name: string) => {
                           const company = availableDrilldownCompanies.find(c => c.id === name);
                           return [`LKR ${value.toLocaleString()}`, company ? company.name : name];
                        }}
                        cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value, entry: any) => {
                           const company = availableDrilldownCompanies.find(c => c.id === entry.dataKey);
                           return <span className="text-slate-600 font-medium ml-1">{company ? company.name : value}</span>;
                        }}
                      />
                      
                      {drilldownCompanyIds.map((id) => (
                        <Line 
                          key={id}
                          type="linear" 
                          dataKey={id} 
                          stroke={companyColors[id]} 
                          strokeWidth={2.5} 
                          dot={{ r: 3, fill: companyColors[id], strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 6, fill: companyColors[id], strokeWidth: 0 }}
                          isAnimationActive={true}
                        />
                      ))}
                    </LineChart>
                   </ResponsiveContainer>
              ) : (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <p className="text-sm">Select one or more companies to view trend comparison</p>
                 </div>
              )}
            </div>
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
