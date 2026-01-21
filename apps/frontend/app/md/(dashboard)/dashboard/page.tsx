"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  DollarSign,
  Building2,
  X,
  Calendar,
  Globe,
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
  Treemap,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { ComplianceTracker } from "@/components/md/ComplianceTracker";
import { FinancialMiniView } from "@/components/md/FinancialMiniView";

// ============ DATA STRUCTURES ============

interface Company {
  id: string;
  name: string;
  pbt: number;
  budget: number;
  variance: number;
  variancePercent: number;
  risk: "low" | "medium" | "high" | "critical";
  trend: "up" | "down" | "stable";
}

interface Cluster {
  id: string;
  name: string;
  pbt: number;
  budget: number;
  ytdPBT: number;
  contribution: number;
  variance: number;
  variancePercent: number;
  risk: "low" | "medium" | "high" | "critical";
  trend: "up" | "down" | "stable";
  forecast: number;
  fiscalCycle: "Jan-Dec" | "Apr-Mar";
  companies: Company[];
}

// ============ MOCK DATA ============

const groupDataMonth = {
  totalPBT: 596500,
  budget: 650000,
  ytdPBT: 5965000,
  priorYearPBT: 550000,
  healthScore: 78,
  cashPositive: 38,
  cashNegative: 8,
  totalCompanies: 46,
  gp: 1850000, 
  gpMargin: 34.2,
  priorYearGp: 1650000, 
  priorYearGpMargin: 32.8,
  pbtAchievement: 91.8,
  revenue: 5200000, 
  revenuePriorYear: 4800000,
  overhead: 1253500,
  overheadPriorYear: 1100000,
};

const groupDataYTD = {
  totalPBT: 6250000, // YTD is cumulative
  budget: 6000000,
  ytdPBT: 6250000,
  priorYearPBT: 5800000,
  healthScore: 82,
  cashPositive: 40,
  cashNegative: 6,
  totalCompanies: 46,
  gp: 22500000, 
  gpMargin: 35.5,
  priorYearGp: 20000000,
  priorYearGpMargin: 33.1,
  pbtAchievement: 104.2,
  revenue: 65000000, 
  revenuePriorYear: 58000000,
  overhead: 14500000,
  overheadPriorYear: 13000000,
};

const clusters: Cluster[] = [
  {
    id: "liner", name: "Liner", pbt: 125800, budget: 120000, ytdPBT: 1258000,
    contribution: 21.1, variance: 5800, variancePercent: 4.8, risk: "low", trend: "up", fiscalCycle: "Jan-Dec",
    companies: [
      { id: "c1", name: "Liner Shipping", pbt: 85000, budget: 80000, variance: 5000, variancePercent: 6.25, risk: "low", trend: "up" },
      { id: "c2", name: "Liner Logistics", pbt: 40800, budget: 40000, variance: 800, variancePercent: 2, risk: "low", trend: "stable" },
    ]
  },
  {
    id: "lube01", name: "Lube 01", pbt: 114600, budget: 102000, ytdPBT: 1146000,
    contribution: 19.2, variance: 12600, variancePercent: 12.4, risk: "low", trend: "up", fiscalCycle: "Jan-Dec",
    companies: [
      { id: "c3", name: "MLL-Automotive", pbt: 48500, budget: 42000, variance: 6500, variancePercent: 15.5, risk: "low", trend: "up" },
      { id: "c4", name: "MLL-Industrial", pbt: 25600, budget: 22000, variance: 3600, variancePercent: 16.4, risk: "low", trend: "up" },
      { id: "c5", name: "Mckupler", pbt: 18500, budget: 16000, variance: 2500, variancePercent: 15.6, risk: "low", trend: "stable" },
      { id: "c6", name: "3M Distribution", pbt: 12800, budget: 14000, variance: -1200, variancePercent: -8.6, risk: "medium", trend: "down" },
      { id: "c7", name: "Mcshaw Automotive", pbt: 9200, budget: 8500, variance: 700, variancePercent: 8.2, risk: "low", trend: "stable" },
    ]
  },
  {
    id: "gac", name: "GAC Group", pbt: 109700, budget: 110000, ytdPBT: 1097000,
    contribution: 18.4, variance: -300, variancePercent: -0.3, risk: "low", trend: "stable", fiscalCycle: "Jan-Dec",
    companies: [
      { id: "c8", name: "GSL", pbt: 42500, budget: 40000, variance: 2500, variancePercent: 6.25, risk: "low", trend: "up" },
      { id: "c9", name: "MSL", pbt: 31200, budget: 28000, variance: 3200, variancePercent: 11.4, risk: "low", trend: "up" },
      { id: "c10", name: "GAC Tug", pbt: 28900, budget: 25000, variance: 3900, variancePercent: 15.6, risk: "low", trend: "up" },
      { id: "c11", name: "GLL", pbt: 15600, budget: 16000, variance: -400, variancePercent: -2.5, risk: "low", trend: "stable" },
      { id: "c12", name: "GMSL", pbt: -8500, budget: 5000, variance: -13500, variancePercent: -270, risk: "critical", trend: "down" },
    ]
  },
  {
    id: "shipping", name: "Shipping Services", pbt: 97000, budget: 89000, ytdPBT: 970000,
    contribution: 16.3, variance: 8000, variancePercent: 9.0, risk: "low", trend: "up", fiscalCycle: "Apr-Mar",
    companies: [
      { id: "c13", name: "MSS Shipping", pbt: 65000, budget: 60000, variance: 5000, variancePercent: 8.3, risk: "low", trend: "up" },
      { id: "c14", name: "MMA Training", pbt: 32000, budget: 29000, variance: 3000, variancePercent: 10.3, risk: "low", trend: "up" },
    ]
  },
  {
    id: "shipsupply", name: "Ship Supply", pbt: 73100, budget: 75000, ytdPBT: 731000,
    contribution: 12.3, variance: -1900, variancePercent: -2.5, risk: "low", trend: "stable", fiscalCycle: "Apr-Mar",
    companies: [
      { id: "c15", name: "Ship Chandlers", pbt: 45000, budget: 46000, variance: -1000, variancePercent: -2.2, risk: "low", trend: "stable" },
      { id: "c16", name: "Marine Supplies", pbt: 28100, budget: 29000, variance: -900, variancePercent: -3.1, risk: "low", trend: "stable" },
    ]
  },
  {
    id: "property", name: "Property", pbt: 47800, budget: 46000, ytdPBT: 478000,
    contribution: 8.0, variance: 1800, variancePercent: 3.9, risk: "low", trend: "stable", fiscalCycle: "Apr-Mar",
    companies: [
      { id: "c17", name: "MLL Properties", pbt: 47800, budget: 46000, variance: 1800, variancePercent: 3.9, risk: "low", trend: "stable" },
    ]
  },
  {
    id: "warehouse", name: "Warehouse & Logistics", pbt: 44300, budget: 40000, ytdPBT: 443000,
    contribution: 7.4, variance: 4300, variancePercent: 10.8, risk: "low", trend: "up", fiscalCycle: "Jan-Dec",
    companies: [
      { id: "c18", name: "MLL Warehousing", pbt: 44300, budget: 40000, variance: 4300, variancePercent: 10.8, risk: "low", trend: "up" },
    ]
  },
  {
    id: "manufacturing", name: "Manufacturing", pbt: 40800, budget: 37500, ytdPBT: 408000,
    contribution: 6.8, variance: 3300, variancePercent: 8.8, risk: "low", trend: "up", fiscalCycle: "Jan-Dec",
    companies: [
      { id: "c19", name: "Industrial Mfg", pbt: 40800, budget: 37500, variance: 3300, variancePercent: 8.8, risk: "low", trend: "up" },
    ]
  },
  {
    id: "hotel", name: "Hotel & Leisure", pbt: 8500, budget: 10000, ytdPBT: 85000,
    contribution: 1.4, variance: -1500, variancePercent: -15, risk: "medium", trend: "down", fiscalCycle: "Apr-Mar",
    companies: [
      { id: "c20", name: "Topaz Hotels", pbt: 8500, budget: 10000, variance: -1500, variancePercent: -15, risk: "medium", trend: "down" },
    ]
  },
  {
    id: "strategic", name: "Strategic Investment", pbt: -5200, budget: -3000, ytdPBT: -52000,
    contribution: -0.9, variance: -2200, variancePercent: -73.3, risk: "medium", trend: "down", fiscalCycle: "Jan-Dec",
    companies: [
      { id: "c21", name: "MGML", pbt: -5200, budget: -3000, variance: -2200, variancePercent: -73.3, risk: "medium", trend: "down" },
    ]
  },
  {
    id: "lube02", name: "Lube 02", pbt: -15000, budget: 14500, ytdPBT: -150000,
    contribution: -2.5, variance: -29500, variancePercent: -203.4, risk: "high", trend: "down", fiscalCycle: "Jan-Dec",
    companies: [
      { id: "c22", name: "Interocean Lubricants", pbt: -10000, budget: 10000, variance: -20000, variancePercent: -200, risk: "critical", trend: "down" },
      { id: "c23", name: "Carplan Lubricants", pbt: -5000, budget: 4500, variance: -9500, variancePercent: -211, risk: "high", trend: "down" },
    ]
  },
  {
    id: "bunkering", name: "Bunkering", pbt: -45000, budget: 20000, ytdPBT: -450000,
    contribution: -7.5, variance: -65000, variancePercent: -325, risk: "critical", trend: "down", fiscalCycle: "Apr-Mar",
    companies: [
      { id: "c24", name: "IOE Group", pbt: -45000, budget: 20000, variance: -65000, variancePercent: -325, risk: "critical", trend: "down" },
    ]
  },
];

// ============ HELPER FUNCTIONS ============

const formatNumber = (num: number) => num?.toLocaleString() ?? '0';
const formatCurrency = (num: number) => `LKR ${(Math.abs(num || 0) / 1000).toFixed(1)}${(num || 0) < 0 ? "M" : "M"}`;
const formatShort = (num: number | undefined | null) => {
  if (num === undefined || num === null) return '0';
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "critical": return { bg: "bg-red-500", text: "text-red-600", light: "bg-red-50", border: "border-red-200" };
    case "high": return { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50", border: "border-amber-200" };
    case "medium": return { bg: "bg-yellow-500", text: "text-yellow-600", light: "bg-yellow-50", border: "border-yellow-200" };
    default: return { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50", border: "border-emerald-200" };
  }
};

// ============ MAIN COMPONENT ============

// --- helpers (UI only) ---
const COLORS = [
  "#0b1f3a",
  "#16a34a",
  "#2563eb",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#eab308",
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  // Keep labels compact: "Jan", "Feb"... (years are implied by continuity)
  return d.toLocaleString("default", { month: "short" });
}

function fullLabel(d: Date) {
  return `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
}

function generateMonthSeries(fromYear = 2020) {
  const start = new Date(fromYear, 0, 1);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);

  const months: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

// deterministic-ish random for UI demo
function seededNoise(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

type CompanyLike = {
  id?: string | number;
  name: string;
  pbt: number;     // base pbt (your existing number)
  budget?: number; // optional
};

function CompanyPbtTrendScroller({
  selectedCompanies,
  selectedCompany,
}: {
  selectedCompanies?: CompanyLike[];
  selectedCompany?: CompanyLike | null;
}) {
  const companies: CompanyLike[] = useMemo(() => {
    if (selectedCompanies?.length) return selectedCompanies;
    return selectedCompany ? [selectedCompany] : [];
  }, [selectedCompanies, selectedCompany]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Build continuous months (2020 -> current)
  const months = useMemo(() => generateMonthSeries(2020), []);

  // Build UI-only chart data (one row per month; keys per company)
  const data = useMemo(() => {
    return months.map((d, idx) => {
      const row: any = {
        key: monthKey(d),
        month: monthLabel(d),
        year: d.getFullYear(),
        full: fullLabel(d),
      };

      companies.forEach((c, ci) => {
        // Create a smooth-ish variation around base PBT
        const base = Number(c.pbt ?? 0);
        const n = seededNoise((idx + 1) * 97 + (ci + 1) * 31);
        const seasonal = Math.sin((idx / 12) * Math.PI * 2) * 0.08; // subtle seasonality
        const variation = (n * 0.22 - 0.11) + seasonal; // ~ +/- 20% + season
        row[c.name] = Math.round(base * (1 + variation));
      });

      return row;
    });
  }, [months, companies]);

  // Auto-scroll to the end (current month) initially
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [companies.length]);

  if (!companies.length) return null;

  // Width: give each month a fixed pixel width so it becomes scrollable
  const PX_PER_MONTH = 72; // adjust: 60–90 good
  const chartWidth = Math.max(months.length * PX_PER_MONTH, 900);

  return (
    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">
            Company PBT Trend{" "}
            <span className="text-slate-400 font-normal">| 2020 → Current</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Swipe / drag horizontally to view past months and years.
          </p>
        </div>

        {/* Optional: keep your range chips if you want UI only (not wired here) */}
        <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
          <button className="px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 rounded">
            6M
          </button>
          <button className="px-2 py-1 text-[10px] font-medium text-[#0b1f3a] bg-slate-100 rounded shadow-sm">
            12M
          </button>
        </div>
      </div>

      {/* Horizontal scroller */}
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto overflow-y-hidden rounded-lg border border-slate-200 bg-white"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Fixed-width inner canvas so the chart can scroll */}
        <div style={{ width: chartWidth, height: 260, padding: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload;
                  return p?.full ?? "";
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={28}
                wrapperStyle={{ fontSize: "12px" }}
              />

              {/* One line per company, different colors */}
              {companies.map((c, i) => (
                <Line
                  key={c.name}
                  type="monotone"
                  dataKey={c.name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tiny hint for desktop users */}
      <div className="mt-2 text-[11px] text-slate-500">
        Tip: On desktop, use shift + mouse wheel or trackpad horizontal scroll.
      </div>
    </div>
  );
}

export default function MDDashboard() {
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  // Period selection
  const [overviewMode, setOverviewMode] = useState<"month" | "ytd">("month");
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // October
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  
  // Drilldown specific time state (Anchor for Performance Hierarchy)
  const [drilldownMonth, setDrilldownMonth] = useState<number>(10);
  const [drilldownYear, setDrilldownYear] = useState<number>(2025);

  // Simulated data fetching functions
  const getContributionByMonth = (year: number, month: number) => {
    // Return mock monthly data for ALL clusters
    // Measurement: Contribution Percentage (%)
    return [
      { name: "Liner", value: 21.1, pbt: 125800, risk: "low" },
      { name: "Lube 01", value: 19.2, pbt: 114600, risk: "low" },
      { name: "GAC Group", value: 18.4, pbt: 109700, risk: "low" },
      { name: "Shipping", value: 16.3, pbt: 97000, risk: "low" },
      { name: "Ship Supply", value: 12.3, pbt: 73100, risk: "low" },
      { name: "Property", value: 8.0, pbt: 47800, risk: "low" },
      { name: "Warehouse", value: 7.4, pbt: 44300, risk: "low" },
      { name: "Mfg", value: 6.8, pbt: 40800, risk: "low" },
      { name: "Hotel", value: 1.4, pbt: 8500, risk: "medium" }, // Hotel & Leisure
      { name: "Strategic", value: -0.9, pbt: -5200, risk: "medium" }, // Strategic Investment
      { name: "Lube 02", value: -2.5, pbt: -15000, risk: "high" }, // Lube 02
      { name: "Bunkering", value: -7.5, pbt: -45000, risk: "critical" }, // Bunkering
    ];
  };

  const getContributionYTD = (year: number) => {
    // Return mock YTD data for ALL clusters
    // Measurement: Contribution Percentage (%)
    return [
      { name: "Liner", value: 22.5, pbt: 1450000, risk: "low" },
      { name: "Lube 01", value: 18.8, pbt: 1210000, risk: "low" },
      { name: "GAC Group", value: 17.5, pbt: 1120000, risk: "low" },
      { name: "Shipping", value: 15.9, pbt: 1020000, risk: "low" },
      { name: "Ship Supply", value: 11.5, pbt: 740000, risk: "low" },
      { name: "Property", value: 8.5, pbt: 550000, risk: "low" },
      { name: "Warehouse", value: 7.8, pbt: 500000, risk: "low" },
      { name: "Mfg", value: 7.0, pbt: 450000, risk: "low" },
      { name: "Hotel", value: 1.2, pbt: 85000, risk: "medium" },
      { name: "Strategic", value: -1.0, pbt: -52000, risk: "medium" },
      { name: "Lube 02", value: -3.0, pbt: -150000, risk: "high" },
      { name: "Bunkering", value: -8.5, pbt: -450000, risk: "critical" },
    ];
  };

  // Memoized chart data based on mode
  const chartData = useMemo(() => {
    if (overviewMode === "month") {
      return getContributionByMonth(selectedYear, selectedMonth);
    } else {
      return getContributionYTD(selectedYear);
    }
  }, [overviewMode, selectedMonth, selectedYear]);
  

  // Dynamic Group Data
  const groupData = useMemo(() => {
    return overviewMode === "month" ? groupDataMonth : groupDataYTD;
  }, [overviewMode]);

  // Currency State
  const [currency, setCurrency] = useState<"LKR" | "USD">("LKR");
  const [exchangeRate, setExchangeRate] = useState<number>(300);

  // Currency Helpers
  const convertValue = (val: number) => currency === "USD" ? val / exchangeRate : val;
  
  const formatFinancial = (val: number) => { // Replaces formatCurrency
    const converted = convertValue(val);
    if (currency === "USD") {
      return `$${(Math.abs(converted) / 1000).toFixed(2)}M`;
    }
    return `LKR ${(Math.abs(converted) / 1000).toFixed(1)}${converted < 0 ? "M" : "M"}`;
  };

  const formatRawNumber = (val: number) => { // Replaces formatNumber for lists
    return convertValue(val).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };
  
  // Available months/years for dropdown
  const availableMonths = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];
  
  const availableYears = [2024, 2025, 2026];
  
  // Get selected month name
  const selectedMonthName = availableMonths.find(m => m.value === selectedMonth)?.label || "October";

  // Sorted clusters for chart
  const sortedClusters = useMemo(() => 
    [...clusters].sort((a, b) => b.pbt - a.pbt), []);

  // Treemap data
  const treemapData = useMemo(() => 
    clusters.filter(c => c.pbt > 0).map(c => ({
      name: c.name,
      size: c.pbt,
      pbt: c.pbt,
      risk: c.risk,
      id: c.id,
    })), []);

  // Waterfall chart data


  const handleClusterClick = (cluster: Cluster) => {
    setSelectedCluster(cluster);
    setSelectedCompany(null);
  };

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
  };

  const closePanel = () => {
    setSelectedCluster(null);
    setSelectedCompany(null);
  };

  // Risk summary
  const riskSummary = useMemo(() => {
    const critical = clusters.filter(c => c.risk === "critical").length;
    const high = clusters.filter(c => c.risk === "high").length;
    return { critical, high };
  }, []);

  // Compute Top & Bottom 5 Performers by Achievement %
  const { topPerformers, bottomPerformers } = useMemo(() => {
    // 1. Flatten all companies from all clusters
    const allCompanies = clusters.flatMap(cluster => cluster.companies);
    
    // 2. Calculate achievement % for each and add to object
    const companiesWithAchievement = allCompanies.map(company => {
      // Avoid division by zero
      const budget = company.budget === 0 ? 1 : company.budget;
      const achievement = (company.pbt / budget) * 100;
      return { ...company, achievement };
    });

    // 3. Sort by achievement (descending)
    const sorted = [...companiesWithAchievement].sort((a, b) => b.achievement - a.achievement);

    // 4. Slice top 5 and bottom 5
    return {
      topPerformers: sorted.slice(0, 5),
      bottomPerformers: sorted.slice(-5).sort((a, b) => a.achievement - b.achievement), // Sort bottom list ascending (lowest first)
    };
  }, []);

  // Compute YTD Segmented Performers (Jan-Dec vs Apr-Mar)
  const ytdSegments = useMemo(() => {
    // Flatten and include fiscal cycle
    const allCompanies = clusters.flatMap(c => c.companies.map(co => ({
        ...co, 
        fiscalCycle: c.fiscalCycle || "Jan-Dec",
        achievement: (co.pbt / (co.budget === 0 ? 1 : co.budget)) * 100
    })));
    
    // Split by cycle
    const janDec = allCompanies.filter(c => c.fiscalCycle === "Jan-Dec");
    const aprMar = allCompanies.filter(c => c.fiscalCycle === "Apr-Mar");

    // Helper to get top/bottom 5
    const getRanked = (list: typeof allCompanies) => {
        const sorted = [...list].sort((a, b) => b.achievement - a.achievement);
        return {
            top: sorted.slice(0, 5),
            bottom: sorted.slice(-5).sort((a, b) => a.achievement - b.achievement) // Ascending (lowest first)
        };
    };

    return {
        janDec: getRanked(janDec),
        aprMar: getRanked(aprMar)
    };
  }, []);

  return (
    <div className="min-h-full bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6">
        
        {/* Header - Responsive: stacks on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Group Strategic Overview</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Unified view: Group → Cluster → Company {currency === "USD" && `• Converted @ ${exchangeRate} LKR/USD`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Currency Controls */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 mr-2 shadow-sm">
              <div className="flex items-center px-3 py-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wide">USD RATE</span>
                <span className="text-sm font-medium text-slate-500 mr-1.5">LKR</span>
                <input 
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-20 bg-transparent text-lg font-bold text-[#0b1f3a] focus:outline-none text-right border-b border-transparent focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                onClick={() => setCurrency(c => c === "LKR" ? "USD" : "LKR")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-all ${
                  currency === "USD" 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 bg-slate-100"
                }`}
              >
                <Globe className="h-4 w-4" />
                {currency}
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1" />
            {/* Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setOverviewMode("month")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  overviewMode === "month" ? "bg-white text-[#0b1f3a] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setOverviewMode("ytd")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  overviewMode === "ytd" ? "bg-white text-[#0b1f3a] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                YTD
              </button>
            </div>

            {/* Month & Year Selectors - Only Visible in Month Mode */}
            {overviewMode === "month" && (
              <>
                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs font-medium text-slate-600 hidden sm:block">Month:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 focus:border-[#0b1f3a]"
                  >
                    {availableMonths.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs font-medium text-slate-600 hidden sm:block">Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 focus:border-[#0b1f3a]"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            {overviewMode === "ytd" && (
              <div className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-medium flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>YTD View (Automatic)</span>
              </div>
            )}
            
            <div className="hidden sm:block h-6 w-px bg-slate-200" />
            <span className="text-xs text-slate-500 hidden md:block">Last updated: 2 hours ago</span>
          </div>
        </div>

        {/* ============ GROUP KPIs (Level 1) ============ */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
          {/* Tile 1: Revenue */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Revenue</span>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#0b1f3a] truncate">{formatFinancial(groupData.revenue)}</p>
            <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap">
              <span className="flex items-center text-[10px] sm:text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                +{((groupData.revenue - groupData.revenuePriorYear) / groupData.revenuePriorYear * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">vs Prior Year</span>
            </div>
          </div>

          {/* Tile 2: GP */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">GP</span>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#0b1f3a] truncate">{formatFinancial(groupData.gp)}</p>
            <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap">
              <span className="flex items-center text-[10px] sm:text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                +12.1%
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">vs Prior Year</span>
            </div>
          </div>

          {/* Tile 3: GP Margin */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">GP Margin</span>
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#0b1f3a]">{groupData.gpMargin}%</p>
            <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap">
              <span className="flex items-center text-[10px] sm:text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                +{(groupData.gpMargin - groupData.priorYearGpMargin).toFixed(1)}%
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">vs Prior Year</span>
            </div>
          </div>

          {/* Tile 4: Total Overhead */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Total Overhead</span>
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#0b1f3a] truncate">{formatFinancial(groupData.overhead)}</p>
            <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap">
              <span className="flex items-center text-[10px] sm:text-xs font-medium text-red-600">
                <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                +{((groupData.overhead - groupData.overheadPriorYear) / groupData.overheadPriorYear * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">vs Prior Year</span>
            </div>
          </div>

          {/* Tile 5: Actual PBT */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Actual PBT</span>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#0b1f3a] truncate">{formatFinancial(groupData.totalPBT)}</p>
            <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap">
              <span className="flex items-center text-[10px] sm:text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                +8.4%
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">vs Prior Year</span>
            </div>
          </div>

          {/* Tile 6: PBT Achievement */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">PBT Achievement</span>
              <Target className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#0b1f3a]">
              {groupData.pbtAchievement}%
            </p>
            <div className="w-full h-1 sm:h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full ${groupData.pbtAchievement >= 100 ? "bg-emerald-500" : "bg-[#0b1f3a]"}`} 
                style={{ width: `${Math.min(groupData.pbtAchievement, 100)}%` }} 
              />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">of target</p>
          </div>
        </div>

        {/* ============ TOP & BOTTOM PERFORMERS ============ */}
        {/* ============ TOP & BOTTOM PERFORMERS ============ */}
        {overviewMode === "month" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {/* Top 5 Performers */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-900">Top 5 Performers</h3>
                <p className="text-xs text-slate-500">Highest PBT Achievement % (Month)</p>
              </div>
              <div className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-12">Rank</th>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Company</th>
                      <th className="px-5 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Achiev %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topPerformers.map((company, index) => (
                      <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-500 font-medium">#{index + 1}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{company.name}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                            {company.achievement.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom 5 Performers */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-900">Bottom 5 Performers</h3>
                <p className="text-xs text-slate-500">Lowest PBT Achievement % (Month)</p>
              </div>
              <div className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-12">Rank</th>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Company</th>
                      <th className="px-5 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Achiev %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bottomPerformers.map((company, index) => (
                      <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-500 font-medium">#{index + 1}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{company.name}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            company.achievement >= 90 ? "bg-emerald-100 text-emerald-700" : 
                            company.achievement >= 70 ? "bg-amber-100 text-amber-800" : 
                            "bg-red-100 text-red-700"
                          }`}>
                            {company.achievement.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* YTD View - Fiscal Year Performance Breakdown */
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">YTD Performance Breakdown (Fiscal Year)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              
              {/* Jan-Dec Top 5 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-emerald-100 bg-emerald-50/30 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Top Performers</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">Jan — Dec (YTD)</p>
                  </div>
                  <Target className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="divide-y divide-slate-100">
                  {ytdSegments.janDec.top.map((company, index) => (
                    <div key={`jd-top-${company.id}`} className="px-4 py-2 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex-shrink-0 w-5 text-center">
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full">#{index+1}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-700 truncate">{company.name}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 ml-2">{company.achievement.toFixed(0)}%</span>
                    </div>
                  ))}
                  {ytdSegments.janDec.top.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No data</div>}
                </div>
              </div>

              {/* Jan-Dec Bottom 5 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-red-100 bg-red-50/30 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Critical Concerns</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">Jan — Dec (YTD)</p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div className="divide-y divide-slate-100">
                  {ytdSegments.janDec.bottom.map((company, index) => (
                    <div key={`jd-btm-${company.id}`} className="px-4 py-2 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex-shrink-0 w-5 text-center">
                            <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded-full">#{index+1}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-700 truncate">{company.name}</span>
                      </div>
                      <span className="text-xs font-bold text-red-600 ml-2">{company.achievement.toFixed(0)}%</span>
                    </div>
                  ))}
                  {ytdSegments.janDec.bottom.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No data</div>}
                </div>
              </div>

              {/* Apr-Mar Top 5 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-blue-100 bg-blue-50/30 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Top Performers</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">Apr — Mar (YTD)</p>
                  </div>
                  <Target className="h-4 w-4 text-blue-500" />
                </div>
                <div className="divide-y divide-slate-100">
                  {ytdSegments.aprMar.top.map((company, index) => (
                    <div key={`am-top-${company.id}`} className="px-4 py-2 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                         <div className="flex-shrink-0 w-5 text-center">
                            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">#{index+1}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-700 truncate">{company.name}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-600 ml-2">{company.achievement.toFixed(0)}%</span>
                    </div>
                  ))}
                  {ytdSegments.aprMar.top.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No data</div>}
                </div>
              </div>

              {/* Apr-Mar Bottom 5 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-orange-100 bg-orange-50/30 flex justify-between items-center">
                   <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Critical Concerns</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">Apr — Mar (YTD)</p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </div>
                <div className="divide-y divide-slate-100">
                  {ytdSegments.aprMar.bottom.map((company, index) => (
                    <div key={`am-btm-${company.id}`} className="px-4 py-2 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex-shrink-0 w-5 text-center">
                            <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded-full">#{index+1}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-700 truncate">{company.name}</span>
                      </div>
                      <span className="text-xs font-bold text-orange-600 ml-2">{company.achievement.toFixed(0)}%</span>
                    </div>
                  ))}
                   {ytdSegments.aprMar.bottom.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No data</div>}
                </div>
              </div>

            </div>
          </div>
        )}



        {/* ============ MAIN VISUALIZATION (Level 2 - Clusters) ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5 mb-6">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
            <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">Cluster Contribution Analysis</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Contribution % by Cluster</p>
                </div>
              
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Controls removed as they are now global */}
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }} 
                      angle={-45} 
                      textAnchor="end" 
                      height={80} 
                      stroke="#64748b"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }} 
                      tickFormatter={(v) => `${v}%`} 
                      stroke="#64748b"
                    />
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `${value.toFixed(1)}% (${currency} ${formatRawNumber(props.payload.pbt)})`,
                        "Contribution"
                      ]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: '12px' }}
                      cursor={{ fill: "#f1f5f9" }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.risk === "critical" || entry.risk === "high" ? "#f59e0b" : "#0b1f3a"} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Risk Summary Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Risk Radar</h3>
              <p className="text-xs text-slate-500 mt-0.5">Clusters requiring attention</p>
            </div>
            <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
              {clusters
                .filter(c => c.risk === "critical" || c.risk === "high" || c.risk === "medium")
                .sort((a, b) => {
                  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                  return riskOrder[a.risk] - riskOrder[b.risk];
                })
                .map(cluster => {
                  return (
                    <div
                      key={cluster.id}
                      onClick={() => handleClusterClick(cluster)}
                      className="p-4 rounded-lg border border-slate-200 bg-white cursor-pointer transition-all hover:shadow-md hover:border-[#0b1f3a]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-800">{cluster.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          cluster.risk === "critical" ? "bg-red-50 text-red-700" :
                          cluster.risk === "high" ? "bg-red-50 text-red-600" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {cluster.risk}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-500">PBT ({currency})</p>
                          <p className={`font-semibold ${cluster.pbt >= 0 ? "text-slate-800" : "text-red-600"}`}>
                            {formatRawNumber(cluster.pbt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Variance</p>
                          <p className={`font-semibold ${cluster.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {cluster.variancePercent}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* ============ COMPLIANCE TRACKER ============ */}
        <div className="mt-6 min-h-[600px]">
          <ComplianceTracker />
        </div>
      </div>

      {/* ============ DRILL-DOWN PANEL (Level 3 - Companies) ============ */}
      {selectedCluster && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 z-50 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{selectedCluster.name}</h3>
              <p className="text-xs text-slate-500">Cluster → Company Drilldown</p>
            </div>
            <button onClick={closePanel} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Cluster Summary */}
          <div className="p-5 border-b border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Month PBT</p>
                <p className={`text-xl font-bold ${selectedCluster.pbt >= 0 ? "text-slate-900" : "text-red-600"}`}>
                  {formatFinancial(selectedCluster.pbt)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">vs Budget</p>
                <p className={`text-xl font-bold ${selectedCluster.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {selectedCluster.variancePercent}%
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Risk Level</p>
                <span className={`px-2 py-1 text-sm font-medium rounded ${
                  selectedCluster.risk === "low" ? "bg-emerald-100 text-emerald-700" :
                  selectedCluster.risk === "medium" ? "bg-yellow-100 text-yellow-700" :
                  selectedCluster.risk === "high" ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {selectedCluster.risk.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Company PBT Trend Chart (Visible when Company Selected) */}
          {selectedCompany && (
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    {selectedCompany.name} <span className="text-slate-400 font-normal">| PBT Trend</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Continuous Monthly Timeline (Anchor: {availableMonths.find(m => m.value === drilldownMonth)?.label} {drilldownYear})
                  </p>
                </div>
                {/* Range Controls */}
                <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
                  <button className="px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 rounded">6M</button>
                  <button className="px-2 py-1 text-[10px] font-medium text-[#0b1f3a] bg-slate-100 rounded shadow-sm">12M</button>
                </div>
              </div>
              
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    // Dynamic Mock Data for 12 months ending at drilldownMonth/Year
                    ...Array.from({ length: 12 }).map((_, i) => {
                      const d = new Date(drilldownYear, drilldownMonth - 1 - (11 - i), 1);
                      return {
                        month: d.toLocaleString('default', { month: 'short' }),
                        year: d.getFullYear(),
                        value: selectedCompany.pbt * (0.8 + Math.random() * 0.4), // Random variation
                        budget: selectedCompany.budget * (0.9 + Math.random() * 0.2)
                      };
                    })
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false}
                      interval={0}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#0b1f3a" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: "#0b1f3a" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="budget" 
                      stroke="#94a3b8" 
                      strokeWidth={2} 
                      strokeDasharray="4 4" 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Companies List (Performance Hierarchy) */}
          <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-10">
            <h4 className="text-sm font-semibold text-slate-700 uppercase">
              Performance Hierarchy
            </h4>
            
            {/* Drilldown Anchor Selectors */}
            <div className="flex items-center gap-2">
              <select
                value={drilldownMonth}
                onChange={(e) => setDrilldownMonth(Number(e.target.value))}
                className="h-8 px-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded focus:outline-none focus:border-[#0b1f3a]"
              >
                {availableMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={drilldownYear}
                onChange={(e) => setDrilldownYear(Number(e.target.value))}
                className="h-8 px-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded focus:outline-none focus:border-[#0b1f3a]"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-5">
            <div className="space-y-3">
              {selectedCluster.companies.map(company => {
                const isSelected = selectedCompany?.id === company.id;
                const colors = getRiskColor(company.risk);
                return (
                  <div
                    key={company.id}
                    onClick={() => handleCompanyClick(company)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected ? "border-[#0b1f3a] ring-2 ring-[#0b1f3a]/10 bg-blue-50" : `${colors.border} hover:shadow-md`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-800">{company.name}</span>
                      {company.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                      {company.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">PBT</p>
                        <p className={`font-semibold ${company.pbt >= 0 ? "text-slate-800" : "text-red-600"}`}>
                          {formatNumber(company.pbt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Variance</p>
                        <p className={`font-semibold ${company.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {company.variancePercent}%
                        </p>
                      </div>
                    </div>
                    {company.risk !== "low" && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          company.risk === "critical" ? "bg-red-100 text-red-700" :
                          company.risk === "high" ? "bg-amber-100 text-amber-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {company.risk} risk
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
