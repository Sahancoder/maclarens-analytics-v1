"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  ReferenceArea,
} from "recharts";
import {
  usePerformanceHierarchy,
  useCompanyDetail,
} from "@/hooks/use-api";
import { MDAPI } from "@/lib/api-client";

// ============ DATA MODELS ============

// Company/Cluster from API hierarchy
interface HCompany {
  id: string;
  name: string;
  code: string;
  pbt_actual: number;
  pbt_budget: number;
  achievement_pct: number;
  gp_margin: number;
  report_status: string | null;
  ytd_pbt_actual: number;
  ytd_pbt_budget: number;
  ytd_achievement_pct: number;
  fiscal_year_start_month: number;
}

interface HCluster {
  id: string;
  name: string;
  code: string;
  pbt_actual: number;
  pbt_budget: number;
  achievement_pct: number;
  company_count: number;
  companies: HCompany[];
  ytd_pbt_actual: number;
  ytd_pbt_budget: number;
  ytd_achievement_pct: number;
}

// ============ HELPERS ============

const formatCurrencyLKR = (val: number, compact = false) => {
  if (compact) {
    if (Math.abs(val) >= 1000000) return `LKR ${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `LKR ${(val / 1000).toFixed(0)}K`;
  }
  return `LKR ${val.toLocaleString()}`;
};
const formatLKR000 = (val: number) => val.toLocaleString();
const formatPercent = (val: number) => val !== null && val !== undefined ? `${val.toFixed(1)}%` : "—";

// Unified Achievement Formula
const calculateAchievement = (actual: number, budget: number) => {
  if (budget === 0 || budget === null || budget === undefined) return 0; 
  const sign = budget >= 0 ? 1 : -1;
  return (1 + sign * ((actual - budget) / budget)) * 100;
};

const getAchievementColor = (achievement: number) => {
  return achievement >= 100 ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50";
};

// ============ SUB-COMPONENTS ============

// --- Multi-Select Component ---
interface MultiSelectProps {
  options: HCompany[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  colors: Record<string, string>;
}

const MultiSelect = ({ options, selectedIds, onChange, colors }: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length >= 5) return;
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


// ============ COMPANY DETAIL MODAL (Real API Data) ============

interface CompanyDetailModalProps {
  companyId: string | null;
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  monthName: string;
}

const CompanyDetailModal = ({ companyId, isOpen, onClose, year, month, monthName }: CompanyDetailModalProps) => {
  const detailState = useCompanyDetail(isOpen ? companyId : null, year, month);
  const detail = detailState.data;

  if (!isOpen || !companyId) return null;

  if (detailState.loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b1f3a] mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Loading company details...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-12 text-center">
          <p className="text-sm text-slate-500">No data available for this company / period</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200">Close</button>
        </div>
      </div>
    );
  }

  const m = detail.monthly;
  const ytd = detail.ytd;
  const fiscalLabel = detail.fiscal_year_start_month === 1 ? "Jan-Dec" : detail.fiscal_year_start_month === 4 ? "Apr-Mar" : `Month ${detail.fiscal_year_start_month}`;

  const GridRow = ({ label, monthly, ytdVal, isBold = false, isHeader = false, isAccent = false, isNegative = false }: any) => {
    if (isHeader) {
      return (
        <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_140px_140px] items-center border-b-2 border-slate-100 pb-2 mb-2">
           <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">{label || "Metric"}</div>
           <div className="text-right text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider px-2 sm:px-3 border-l border-slate-100">Monthly</div>
           <div className="text-right text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider px-2 sm:px-3 border-l border-slate-100">YTD</div>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_140px_140px] items-center py-2 sm:py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 rounded-sm">
         <div className={`pl-2 pr-2 sm:pr-4 ${isBold ? 'font-semibold text-slate-800' : 'text-slate-600 font-medium'} text-xs sm:text-sm truncate`}>{label}</div>
         <div className={`text-right px-2 sm:px-3 border-l border-slate-100 font-mono text-xs sm:text-sm tracking-tight ${isBold ? 'font-bold' : 'font-medium'} ${isNegative ? 'text-red-600' : (isAccent ? 'text-[#0b1f3a]' : 'text-slate-700')}`}>{monthly}</div>
         <div className={`text-right px-2 sm:px-3 border-l border-slate-100 font-mono text-xs sm:text-sm tracking-tight ${isBold ? 'font-bold' : 'font-medium'} ${isNegative ? 'text-red-600' : (isAccent ? 'text-[#0b1f3a]' : 'text-slate-700')} bg-slate-50/50 -my-2 sm:-my-2.5 py-2 sm:py-2.5`}>{ytdVal}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-start sm:items-center justify-between bg-slate-50 gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{detail.company_name}</h3>
            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-6 gap-y-1 mt-1 text-[10px] sm:text-xs text-slate-500">
               <span className="px-1.5 sm:px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-medium">
                 Fiscal: {fiscalLabel}
               </span>
               <span className="flex items-center gap-1 sm:gap-2">
                 <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-400"></span>
                 <span className="font-semibold text-slate-700">Monthly:</span> {monthName} {year}
               </span>
               <span className="flex items-center gap-1 sm:gap-2">
                 <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-400"></span>
                 <span className="font-semibold text-slate-700">YTD:</span> {detail.ytd_label} ({detail.ytd_months} Mo.)
               </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-slate-50/50">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-x-8 sm:gap-y-6">
            
            {/* GROUP 1: Revenue & GP */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Revenue & Gross Profit</h4>
               <div className="space-y-1">
                  <GridRow isHeader label="" monthly="Monthly" ytdVal="YTD" />
                  <GridRow label="Revenue (LKR)" monthly={formatLKR000(m.revenue_lkr)} ytdVal={formatLKR000(ytd.revenue_lkr)} />
                  <div className="border-t border-slate-100 my-2" />
                  <GridRow label="Gross Profit (LKR)" isBold monthly={formatLKR000(m.gp)} ytdVal={formatLKR000(ytd.gp)} />
                  <GridRow label="GP Margin" monthly={formatPercent(m.gp_margin)} ytdVal={formatPercent(ytd.gp_margin)} />
               </div>
            </div>

            {/* GROUP 2: Expenses */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Expenses Breakdown (LKR)</h4>
               <div className="space-y-1">
                  <GridRow isHeader label="" monthly="Monthly" ytdVal="YTD" />
                  <GridRow label="Personnel Related/HR" monthly={formatLKR000(m.personal_exp)} ytdVal={formatLKR000(ytd.personal_exp)} />
                  <GridRow label="Admin & Establishment" monthly={formatLKR000(m.admin_exp)} ytdVal={formatLKR000(ytd.admin_exp)} />
                  <GridRow label="Selling & Distribution" monthly={formatLKR000(m.selling_exp)} ytdVal={formatLKR000(ytd.selling_exp)} />
                  <GridRow label="Finance Expenses" monthly={formatLKR000(m.finance_exp)} ytdVal={formatLKR000(ytd.finance_exp)} />
                  <GridRow label="Depreciation" monthly={formatLKR000(m.depreciation)} ytdVal={formatLKR000(ytd.depreciation)} />
                  <div className="border-t border-slate-100 my-2" />
                  <GridRow label="Total Overheads" isBold isNegative monthly={`-${formatLKR000(Math.abs(m.total_overhead))}`} ytdVal={`-${formatLKR000(Math.abs(ytd.total_overhead))}`} />
               </div>
            </div>

            {/* GROUP 3: Non-Ops & Provisions */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Other Items (LKR)</h4>
               <div className="space-y-1">
                  <GridRow isHeader label="" monthly="Monthly" ytdVal="YTD" />
                  <GridRow label="Other Income" monthly={formatLKR000(m.other_income)} ytdVal={formatLKR000(ytd.other_income)} />
                  <GridRow label="Provisions / Reversal" monthly={formatLKR000(m.provisions)} ytdVal={formatLKR000(ytd.provisions)} />
                  <GridRow label="Exchange (Loss) / Gain" monthly={formatLKR000(m.exchange_gl)} ytdVal={formatLKR000(ytd.exchange_gl)} />
                  <div className="border-t border-slate-100 my-2" />
                  <GridRow label="Non Ops Income" monthly={formatLKR000(m.non_ops_income)} ytdVal={formatLKR000(ytd.non_ops_income)} />
                  <GridRow label="Non Ops Expenses" monthly={formatLKR000(m.non_ops_exp)} ytdVal={formatLKR000(ytd.non_ops_exp)} />
               </div>
            </div>

             {/* GROUP 4: Profitability */}
             <div className="bg-[#f8fafc] p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
               <h4 className="text-sm font-bold text-[#0b1f3a] uppercase tracking-wide mb-4 border-b border-slate-200 pb-2">Key Profit Metrics (LKR)</h4>
               <div className="space-y-1">
                  <GridRow isHeader label="" monthly="Monthly" ytdVal="YTD" />
                  <GridRow label="EBITDA" isBold monthly={formatLKR000(m.ebitda)} ytdVal={formatLKR000(ytd.ebitda)} />
                  <GridRow label="EBIT" isBold monthly={formatLKR000(m.ebit)} ytdVal={formatLKR000(ytd.ebit)} />
                  <div className="border-t border-slate-200 my-2" />
                  <GridRow label="PBT (Before Non-Ops)" monthly={formatLKR000(m.pbt_before_non_ops)} ytdVal={formatLKR000(ytd.pbt_before_non_ops)} />
                  <GridRow label="PBT (After Non-Ops)" isBold isAccent monthly={formatLKR000(m.pbt_after_non_ops)} ytdVal={formatLKR000(ytd.pbt_after_non_ops)} />
                  <GridRow label="Net Profit Margin" monthly={formatPercent(m.np_margin)} ytdVal={formatPercent(ytd.np_margin)} />
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
                  {detail.fd_comments && detail.fd_comments.length > 0 ? detail.fd_comments.map((comment: any, idx: number) => (
                    <div key={comment.id || idx} className="relative pl-4 border-l-2 border-slate-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-800">{comment.author || comment.type || 'Finance Officer'}</span>
                        {comment.timestamp && (
                          <>
                            <span className="text-slate-300">&#8226;</span>
                            <span className="text-xs text-slate-500">{comment.timestamp}</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed italic">
                        &ldquo;{comment.message}&rdquo;
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
                  )) : (
                    <p className="text-sm text-slate-400 italic text-center py-4">No FD comments available for this period</p>
                  )}
                </div>
              </div>
            </div>

          </div>
          
          {/* Metadata Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-6 text-xs text-slate-500">
             {detail.uploaded_by && <div><span className="font-semibold text-slate-700">Uploaded By: </span>{detail.uploaded_by}</div>}
             {detail.uploaded_at && <div><span className="font-semibold text-slate-700">Timestamp: </span>{detail.uploaded_at}</div>}
             {detail.report_status && <div><span className="font-semibold text-slate-700">Status: </span>{detail.report_status}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};


// ============ MAIN COMPONENT ============

export default function PerformancePage() {
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  // Modal State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Period selection
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() || 12);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  
  const availableMonths = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
  ];
  const currentYear = now.getFullYear();
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const selectedMonthName = availableMonths.find(m => m.value === selectedMonth)?.label || "October";

  // API Hooks
  const hierarchyState = usePerformanceHierarchy(selectedYear, selectedMonth);
  
  // Derive clusters from API
  const clusters: HCluster[] = useMemo(() => {
    return hierarchyState.data?.clusters || [];
  }, [hierarchyState.data]);

  const sortedClusters = useMemo(() => 
    [...clusters].sort((a, b) => b.pbt_actual - a.pbt_actual), [clusters]);

  // Drilldown Chart State
  const [drilldownClusterId, setDrilldownClusterId] = useState<string>("");
  const [drilldownCompanyIds, setDrilldownCompanyIds] = useState<string[]>([]);

  // Trend data for drilldown chart (manual fetch, not hook-based)
  const [trendDataMap, setTrendDataMap] = useState<Record<string, Array<{ year: number; month: number; pbt_actual: number }>>>({});
  const [trendLoading, setTrendLoading] = useState(false);

  // Colors for multi-selection
  const COLOR_PALETTE = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c"];
  
  const companyColors = useMemo(() => {
    const colors: Record<string, string> = {};
    drilldownCompanyIds.forEach((id, index) => {
      colors[id] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    return colors;
  }, [drilldownCompanyIds]);

  // Auto-select first cluster when data loads
  useEffect(() => {
    if (clusters.length > 0 && !drilldownClusterId) {
      setDrilldownClusterId(clusters[0].id);
    }
  }, [clusters, drilldownClusterId]);

  // Auto-select first 2 companies when cluster changes
  useEffect(() => {
    const cluster = clusters.find(c => c.id === drilldownClusterId);
    if (cluster && cluster.companies.length > 0) {
      const allExist = drilldownCompanyIds.every(id => cluster.companies.find(c => c.id === id));
      if (!allExist || drilldownCompanyIds.length === 0) {
        const firstTwo = cluster.companies.slice(0, Math.min(2, cluster.companies.length)).map(c => c.id);
        setDrilldownCompanyIds(firstTwo);
      }
    } else {
      setDrilldownCompanyIds([]);
    }
  }, [drilldownClusterId, clusters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch PBT trend data for selected companies
  const companyIdsKey = drilldownCompanyIds.join(",");
  useEffect(() => {
    if (!companyIdsKey) {
      setTrendDataMap({});
      return;
    }
    const ids = companyIdsKey.split(",");
    setTrendLoading(true);
    
    Promise.all(
      ids.map(id => MDAPI.getPBTTrend({ company_id: id, start_year: 2020 }))
    ).then(results => {
      const map: Record<string, Array<{ year: number; month: number; pbt_actual: number }>> = {};
      results.forEach((res, i) => {
        if (res.data?.data) {
          map[ids[i]] = res.data.data.map(p => ({ year: p.year, month: p.month, pbt_actual: p.pbt_actual }));
        }
      });
      setTrendDataMap(map);
    }).catch(() => {
      // Silently handle error
    }).finally(() => setTrendLoading(false));
  }, [companyIdsKey]);

  // Build chart data from trend responses
  const drilldownData = useMemo(() => {
    const activeIds = drilldownCompanyIds.filter(id => trendDataMap[id]?.length > 0);
    if (activeIds.length === 0) return [];

    const allKeys = new Map<string, any>();
    activeIds.forEach(id => {
      (trendDataMap[id] || []).forEach(point => {
        const key = `${point.year}-${String(point.month).padStart(2, "0")}`;
        if (!allKeys.has(key)) {
          const d = new Date(point.year, point.month - 1, 1);
          allKeys.set(key, {
            key,
            month: d.toLocaleString("default", { month: "short" }),
            year: point.year,
            full: `${d.toLocaleString("default", { month: "short" })} ${point.year}`,
          });
        }
        allKeys.get(key)![id] = point.pbt_actual;
      });
    });

    return Array.from(allKeys.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [drilldownCompanyIds, trendDataMap]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [drilldownData]);

  const availableDrilldownCompanies: HCompany[] = useMemo(() => {
    const c = clusters.find(cl => cl.id === drilldownClusterId);
    return c ? c.companies : [];
  }, [drilldownClusterId, clusters]);

  const toggleCluster = (clusterId: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const handleCompanyClick = (company: HCompany) => {
    setSelectedCompanyId(company.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCompanyId(null);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cluster &rarr; Company Drilldown</h1>
            <p className="text-sm text-slate-500 mt-1">Analyze performance drivers from Cluster to Company level</p>
          </div>
          <div className="flex items-center gap-3">
             {/* Selectors in Performance Hierarchy section below */}
          </div>
        </div>

        {/* Controls & Chart Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
             <div>
                <h3 className="text-base font-semibold text-slate-900">Cluster Drilldown</h3>
                <p className="text-xs text-slate-500 mt-0.5">Company PBT Trend (2020 &rarr; Current)</p>
             </div>

             <div className="flex flex-wrap items-center gap-3">
                {/* Cluster Select */}
                <div className="relative">
                  <select
                    value={drilldownClusterId}
                    onChange={(e) => setDrilldownClusterId(e.target.value)}
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
                <div className="text-[10px] text-slate-400 font-medium">
                  Scroll to view history
                </div>
             </div>
          </div>

          <div className="p-5">
            <div className="h-[320px] w-full">
              {drilldownCompanyIds.length > 0 && drilldownData.length > 0 ? (
                <div 
                  ref={scrollRef}
                  className="w-full h-full overflow-x-auto overflow-y-hidden"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div style={{ width: Math.max(drilldownData.length * 60, 1000), height: "100%" }}>
                   <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={drilldownData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

                      <XAxis 
                        dataKey="key"
                        stroke="#64748b" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) => {
                           const [yr, mo] = val.split("-");
                           const date = new Date(parseInt(yr), parseInt(mo) - 1, 1);
                           return date.toLocaleString("default", { month: "short" });
                        }}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={false}
                        dy={10}
                        interval={0}
                      />
                      <YAxis 
                        stroke="#64748b"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => {
                           if (Math.abs(value) >= 1000000) return `LKR ${(value / 1000000).toFixed(1)}M`;
                           return `LKR ${(value / 1000).toFixed(0)}K`;
                        }}
                        axisLine={false}
                        tickLine={false}
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: "#fff",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          fontSize: "12px" 
                        }}
                        labelStyle={{ color: "#0b1f3a", marginBottom: "0.25rem" }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ""}
                        itemStyle={{ fontWeight: 600 }}
                        formatter={(value: number, name: string) => {
                           const company = availableDrilldownCompanies.find(c => c.id === name);
                           return [`LKR ${value.toLocaleString()}`, company ? company.name : name];
                        }}
                        cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        formatter={(value: string, entry: any) => {
                           const company = availableDrilldownCompanies.find(c => c.id === entry.dataKey);
                           return <span className="text-slate-600 font-medium ml-1 text-xs">{company ? company.name : value}</span>;
                        }}
                        wrapperStyle={{ paddingBottom: "10px" }}
                      />
                      
                      {drilldownCompanyIds.map((id) => (
                        <Line 
                          key={id}
                          type="linear" 
                          dataKey={id} 
                          stroke={companyColors[id]} 
                          strokeWidth={2} 
                          dot={false}
                          activeDot={{ r: 6, fill: companyColors[id], strokeWidth: 0 }}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                   </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    {drilldownCompanyIds.length === 0 ? (
                      <p className="text-sm">Select one or more companies to view trend comparison</p>
                    ) : trendLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0b1f3a]"></div>
                        <p className="text-sm">Loading trend data...</p>
                      </div>
                    ) : (
                      <p className="text-sm">No trend data available for selected companies</p>
                    )}
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* Hierarchical List: Cluster → Company */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Performance Hierarchy</h3>
              <p className="text-xs text-slate-500 mt-0.5">Click cluster row to expand &bull; Click company for full P&amp;L details</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">Month:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-8 px-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10"
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
                  className="h-8 px-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {hierarchyState.loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b1f3a] mx-auto mb-4"></div>
              <p className="text-sm text-slate-500">Loading performance data...</p>
            </div>
          ) : (
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

            {/* Group Totals Row */}
            {hierarchyState.data && (
              <div className="flex items-center bg-[#0b1f3a]/5 border-b-2 border-[#0b1f3a]/20">
                <div className="flex-1 px-5 py-3">
                  <span className="font-bold text-[#0b1f3a] text-sm">GROUP TOTAL</span>
                </div>
                <div className="hidden md:flex items-center bg-slate-100/30">
                  <div className="w-24 px-2 py-3 text-right border-l border-slate-200">
                    <span className="font-bold text-[#0b1f3a] text-sm font-mono">{formatCurrencyLKR(hierarchyState.data.group_pbt_actual, true)}</span>
                  </div>
                  <div className="w-24 px-2 py-3 text-right">
                    <span className="text-slate-600 text-sm font-mono">{formatCurrencyLKR(hierarchyState.data.group_pbt_budget, true)}</span>
                  </div>
                  <div className="w-20 px-2 py-3 text-right">
                    <span className={`text-xs px-2 py-1 rounded font-bold font-mono ${getAchievementColor(calculateAchievement(hierarchyState.data.group_pbt_actual, hierarchyState.data.group_pbt_budget))}`}>
                      {formatPercent(calculateAchievement(hierarchyState.data.group_pbt_actual, hierarchyState.data.group_pbt_budget))}
                    </span>
                  </div>
                </div>
                <div className="hidden lg:flex items-center">
                  <div className="w-24 px-2 py-3 text-right border-l border-slate-200">
                    <span className="font-bold text-[#0b1f3a] text-sm font-mono">{formatCurrencyLKR(hierarchyState.data.group_ytd_pbt_actual, true)}</span>
                  </div>
                  <div className="w-24 px-2 py-3 text-right">
                    <span className="text-slate-600 text-sm font-mono">{formatCurrencyLKR(hierarchyState.data.group_ytd_pbt_budget, true)}</span>
                  </div>
                  <div className="w-20 px-2 py-3 text-right">
                    <span className={`text-xs px-2 py-1 rounded font-bold font-mono ${getAchievementColor(calculateAchievement(hierarchyState.data.group_ytd_pbt_actual, hierarchyState.data.group_ytd_pbt_budget))}`}>
                      {formatPercent(calculateAchievement(hierarchyState.data.group_ytd_pbt_actual, hierarchyState.data.group_ytd_pbt_budget))}
                    </span>
                  </div>
                </div>
              </div>
            )}

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
                         <span className="text-xs text-slate-400 ml-1">({cluster.company_count})</span>
                      </div>
                    </div>

                    {/* Month Metrics */}
                    <div className="hidden md:flex items-center bg-slate-50/30">
                       <div className="w-24 px-2 py-4 text-right border-l border-slate-100">
                          <span className="font-semibold text-slate-900 text-sm font-mono">{formatCurrencyLKR(cluster.pbt_actual, true)}</span>
                       </div>
                       <div className="w-24 px-2 py-4 text-right">
                          <span className="text-slate-500 text-sm font-mono">{formatCurrencyLKR(cluster.pbt_budget, true)}</span>
                       </div>
                       <div className="w-20 px-2 py-4 text-right">
                          <span className={`text-xs px-2 py-1 rounded font-bold font-mono ${getAchievementColor(calculateAchievement(cluster.pbt_actual, cluster.pbt_budget))}`}>
                             {formatPercent(calculateAchievement(cluster.pbt_actual, cluster.pbt_budget))}
                          </span>
                       </div>
                    </div>

                    {/* Year Metrics */}
                    <div className="hidden lg:flex items-center">
                       <div className="w-24 px-2 py-4 text-right border-l border-slate-100">
                          <span className="font-semibold text-slate-900 text-sm font-mono">{formatCurrencyLKR(cluster.ytd_pbt_actual, true)}</span>
                       </div>
                       <div className="w-24 px-2 py-4 text-right">
                          <span className="text-slate-500 text-sm font-mono">{formatCurrencyLKR(cluster.ytd_pbt_budget, true)}</span>
                       </div>
                       <div className="w-20 px-2 py-4 text-right">
                           <span className={`text-xs px-2 py-1 rounded font-bold font-mono ${getAchievementColor(calculateAchievement(cluster.ytd_pbt_actual, cluster.ytd_pbt_budget))}`}>
                             {formatPercent(calculateAchievement(cluster.ytd_pbt_actual, cluster.ytd_pbt_budget))}
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
                                 <span className="text-sm text-slate-700 font-mono font-medium">{formatCurrencyLKR(company.pbt_actual, true)}</span>
                              </div>
                              <div className="w-24 px-2 py-3 text-right">
                                 <span className="text-slate-400 text-xs font-mono">{formatCurrencyLKR(company.pbt_budget, true)}</span>
                              </div>
                              <div className="w-20 px-2 py-3 text-right">
                                  <span className={`text-xs font-bold font-mono ${calculateAchievement(company.pbt_actual, company.pbt_budget) >= 100 ? "text-emerald-700" : "text-red-700"}`}>
                                    {formatPercent(calculateAchievement(company.pbt_actual, company.pbt_budget))}
                                  </span>
                              </div>
                           </div>

                           {/* Year Metrics */}
                           <div className="hidden lg:flex items-center">
                              <div className="w-24 px-2 py-3 text-right border-l border-slate-100">
                                 <span className="text-sm text-slate-700 font-mono font-medium">{formatCurrencyLKR(company.ytd_pbt_actual, true)}</span>
                              </div>
                              <div className="w-24 px-2 py-3 text-right">
                                 <span className="text-slate-400 text-xs font-mono">{formatCurrencyLKR(company.ytd_pbt_budget, true)}</span>
                              </div>
                              <div className="w-20 px-2 py-3 text-right">
                                 <span className={`text-xs font-bold font-mono ${calculateAchievement(company.ytd_pbt_actual, company.ytd_pbt_budget) >= 100 ? "text-emerald-700" : "text-red-700"}`}>
                                    {formatPercent(calculateAchievement(company.ytd_pbt_actual, company.ytd_pbt_budget))}
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

            {clusters.length === 0 && !hierarchyState.loading && (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm">No performance data available for the selected period</p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
      
      {/* Company Detail Modal */}
      <CompanyDetailModal 
        companyId={selectedCompanyId}
        isOpen={isModalOpen} 
        onClose={closeModal}
        year={selectedYear}
        month={selectedMonth}
        monthName={selectedMonthName}
      />
    </div>
  );
}
