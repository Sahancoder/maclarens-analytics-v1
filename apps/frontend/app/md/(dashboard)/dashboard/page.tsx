"use client";

import { useState, useMemo } from "react";
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
  forecast: number;
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
  companies: Company[];
}

// ============ MOCK DATA ============

const groupData = {
  totalPBT: 596500,
  budget: 650000,
  ytdPBT: 5965000,
  priorYearPBT: 550000,
  healthScore: 78,
  cashPositive: 38,
  cashNegative: 8,
  totalCompanies: 46,
  // New metrics for tiles
  gp: 1850000, 
  gpMargin: 34.2,
  priorYearGp: 1650000,
  priorYearGpMargin: 32.8,
  pbtAchievement: 91.8,
};

const clusters: Cluster[] = [
  {
    id: "liner", name: "Liner", pbt: 125800, budget: 120000, ytdPBT: 1258000,
    contribution: 21.1, variance: 5800, variancePercent: 4.8, risk: "low", trend: "up", forecast: 1510000,
    companies: [
      { id: "c1", name: "Liner Shipping", pbt: 85000, budget: 80000, variance: 5000, variancePercent: 6.25, risk: "low", trend: "up", forecast: 1020000 },
      { id: "c2", name: "Liner Logistics", pbt: 40800, budget: 40000, variance: 800, variancePercent: 2, risk: "low", trend: "stable", forecast: 490000 },
    ]
  },
  {
    id: "lube01", name: "Lube 01", pbt: 114600, budget: 102000, ytdPBT: 1146000,
    contribution: 19.2, variance: 12600, variancePercent: 12.4, risk: "low", trend: "up", forecast: 1400000,
    companies: [
      { id: "c3", name: "MLL-Automotive", pbt: 48500, budget: 42000, variance: 6500, variancePercent: 15.5, risk: "low", trend: "up", forecast: 580000 },
      { id: "c4", name: "MLL-Industrial", pbt: 25600, budget: 22000, variance: 3600, variancePercent: 16.4, risk: "low", trend: "up", forecast: 310000 },
      { id: "c5", name: "Mckupler", pbt: 18500, budget: 16000, variance: 2500, variancePercent: 15.6, risk: "low", trend: "stable", forecast: 222000 },
      { id: "c6", name: "3M Distribution", pbt: 12800, budget: 14000, variance: -1200, variancePercent: -8.6, risk: "medium", trend: "down", forecast: 153600 },
      { id: "c7", name: "Mcshaw Automotive", pbt: 9200, budget: 8500, variance: 700, variancePercent: 8.2, risk: "low", trend: "stable", forecast: 110400 },
    ]
  },
  {
    id: "gac", name: "GAC Group", pbt: 109700, budget: 110000, ytdPBT: 1097000,
    contribution: 18.4, variance: -300, variancePercent: -0.3, risk: "low", trend: "stable", forecast: 1300000,
    companies: [
      { id: "c8", name: "GSL", pbt: 42500, budget: 40000, variance: 2500, variancePercent: 6.25, risk: "low", trend: "up", forecast: 510000 },
      { id: "c9", name: "MSL", pbt: 31200, budget: 28000, variance: 3200, variancePercent: 11.4, risk: "low", trend: "up", forecast: 375000 },
      { id: "c10", name: "GAC Tug", pbt: 28900, budget: 25000, variance: 3900, variancePercent: 15.6, risk: "low", trend: "up", forecast: 347000 },
      { id: "c11", name: "GLL", pbt: 15600, budget: 16000, variance: -400, variancePercent: -2.5, risk: "low", trend: "stable", forecast: 187000 },
      { id: "c12", name: "GMSL", pbt: -8500, budget: 5000, variance: -13500, variancePercent: -270, risk: "critical", trend: "down", forecast: -102000 },
    ]
  },
  {
    id: "shipping", name: "Shipping Services", pbt: 97000, budget: 89000, ytdPBT: 970000,
    contribution: 16.3, variance: 8000, variancePercent: 9.0, risk: "low", trend: "up", forecast: 1180000,
    companies: [
      { id: "c13", name: "MSS Shipping", pbt: 65000, budget: 60000, variance: 5000, variancePercent: 8.3, risk: "low", trend: "up", forecast: 780000 },
      { id: "c14", name: "MMA Training", pbt: 32000, budget: 29000, variance: 3000, variancePercent: 10.3, risk: "low", trend: "up", forecast: 400000 },
    ]
  },
  {
    id: "shipsupply", name: "Ship Supply", pbt: 73100, budget: 75000, ytdPBT: 731000,
    contribution: 12.3, variance: -1900, variancePercent: -2.5, risk: "low", trend: "stable", forecast: 875000,
    companies: [
      { id: "c15", name: "Ship Chandlers", pbt: 45000, budget: 46000, variance: -1000, variancePercent: -2.2, risk: "low", trend: "stable", forecast: 540000 },
      { id: "c16", name: "Marine Supplies", pbt: 28100, budget: 29000, variance: -900, variancePercent: -3.1, risk: "low", trend: "stable", forecast: 335000 },
    ]
  },
  {
    id: "property", name: "Property", pbt: 47800, budget: 46000, ytdPBT: 478000,
    contribution: 8.0, variance: 1800, variancePercent: 3.9, risk: "low", trend: "stable", forecast: 580000,
    companies: [
      { id: "c17", name: "MLL Properties", pbt: 47800, budget: 46000, variance: 1800, variancePercent: 3.9, risk: "low", trend: "stable", forecast: 580000 },
    ]
  },
  {
    id: "warehouse", name: "Warehouse & Logistics", pbt: 44300, budget: 40000, ytdPBT: 443000,
    contribution: 7.4, variance: 4300, variancePercent: 10.8, risk: "low", trend: "up", forecast: 540000,
    companies: [
      { id: "c18", name: "MLL Warehousing", pbt: 44300, budget: 40000, variance: 4300, variancePercent: 10.8, risk: "low", trend: "up", forecast: 540000 },
    ]
  },
  {
    id: "manufacturing", name: "Manufacturing", pbt: 40800, budget: 37500, ytdPBT: 408000,
    contribution: 6.8, variance: 3300, variancePercent: 8.8, risk: "low", trend: "up", forecast: 500000,
    companies: [
      { id: "c19", name: "Industrial Mfg", pbt: 40800, budget: 37500, variance: 3300, variancePercent: 8.8, risk: "low", trend: "up", forecast: 500000 },
    ]
  },
  {
    id: "hotel", name: "Hotel & Leisure", pbt: 8500, budget: 10000, ytdPBT: 85000,
    contribution: 1.4, variance: -1500, variancePercent: -15, risk: "medium", trend: "down", forecast: 95000,
    companies: [
      { id: "c20", name: "Topaz Hotels", pbt: 8500, budget: 10000, variance: -1500, variancePercent: -15, risk: "medium", trend: "down", forecast: 95000 },
    ]
  },
  {
    id: "strategic", name: "Strategic Investment", pbt: -5200, budget: -3000, ytdPBT: -52000,
    contribution: -0.9, variance: -2200, variancePercent: -73.3, risk: "medium", trend: "down", forecast: -60000,
    companies: [
      { id: "c21", name: "MGML", pbt: -5200, budget: -3000, variance: -2200, variancePercent: -73.3, risk: "medium", trend: "down", forecast: -60000 },
    ]
  },
  {
    id: "lube02", name: "Lube 02", pbt: -15000, budget: 14500, ytdPBT: -150000,
    contribution: -2.5, variance: -29500, variancePercent: -203.4, risk: "high", trend: "down", forecast: -180000,
    companies: [
      { id: "c22", name: "Interocean Lubricants", pbt: -10000, budget: 10000, variance: -20000, variancePercent: -200, risk: "critical", trend: "down", forecast: -120000 },
      { id: "c23", name: "Carplan Lubricants", pbt: -5000, budget: 4500, variance: -9500, variancePercent: -211, risk: "high", trend: "down", forecast: -60000 },
    ]
  },
  {
    id: "bunkering", name: "Bunkering", pbt: -45000, budget: 20000, ytdPBT: -450000,
    contribution: -7.5, variance: -65000, variancePercent: -325, risk: "critical", trend: "down", forecast: -520000,
    companies: [
      { id: "c24", name: "IOE Group", pbt: -45000, budget: 20000, variance: -65000, variancePercent: -325, risk: "critical", trend: "down", forecast: -520000 },
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

export default function MDDashboard() {
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  // Contribution Analysis State
  const [contributionMode, setContributionMode] = useState<"month" | "ytd">("month");
  const [contributionMonth, setContributionMonth] = useState<number>(10);
  const [contributionYear, setContributionYear] = useState<number>(2025);

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
    if (contributionMode === "month") {
      return getContributionByMonth(contributionYear, contributionMonth);
    } else {
      return getContributionYTD(contributionYear);
    }
  }, [contributionMode, contributionMonth, contributionYear]);
  
  // Period selection
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // October
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  
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

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1600px] mx-auto p-6">
        
        {/* ============ HEADER ============ */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Group Strategic Overview</h1>
            <p className="text-sm text-slate-500 mt-1">
              Unified view: Group → Cluster → Company
            </p>
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
            
            <div className="h-6 w-px bg-slate-200" />
            <span className="text-xs text-slate-500">Last updated: 2 hours ago</span>
          </div>
        </div>

        {/* ============ GROUP KPIs (Level 1) ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Tile 1: GP Margin */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">GP Margin</span>
              <Activity className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-[#0b1f3a]">{groupData.gpMargin}%</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-3 w-3" />
                +{(groupData.gpMargin - groupData.priorYearGpMargin).toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">vs Prior Year</span>
            </div>
          </div>

          {/* Tile 2: GP */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">GP</span>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-[#0b1f3a]">{formatCurrency(groupData.gp)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-3 w-3" />
                +12.1%
              </span>
              <span className="text-xs text-slate-400">vs Prior Year</span>
            </div>
          </div>

          {/* Tile 3: Actual PBT */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Actual PBT</span>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-[#0b1f3a]">{formatCurrency(groupData.totalPBT)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-3 w-3" />
                +8.4%
              </span>
              <span className="text-xs text-slate-400">vs Prior Year</span>
            </div>
          </div>

          {/* Tile 4: PBT Achievement */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">PBT Achievement</span>
              <Target className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-[#0b1f3a]">
              {groupData.pbtAchievement}%
            </p>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full ${groupData.pbtAchievement >= 100 ? "bg-emerald-500" : "bg-[#0b1f3a]"}`} 
                style={{ width: `${Math.min(groupData.pbtAchievement, 100)}%` }} 
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">of target</p>
          </div>
        </div>

        {/* ============ TOP & BOTTOM PERFORMERS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Top 5 Performers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Top 5 Performers</h3>
              <p className="text-xs text-slate-500">Highest PBT Achievement %</p>
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
              <p className="text-xs text-slate-500">Lowest PBT Achievement %</p>
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



        {/* ============ MAIN VISUALIZATION (Level 2 - Clusters) ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Cluster Contribution Analysis</h3>
                <p className="text-xs text-slate-500 mt-0.5">Contribution % by Cluster</p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Mode Toggles */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setContributionMode("month")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      contributionMode === "month" ? "bg-white text-[#0b1f3a] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setContributionMode("ytd")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      contributionMode === "ytd" ? "bg-white text-[#0b1f3a] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    YTD
                  </button>
                </div>

                {/* Conditional Dropdowns */}
                <div className="flex items-center gap-2">
                  {contributionMode === "month" && (
                    <select
                      value={contributionMonth}
                      onChange={(e) => setContributionMonth(Number(e.target.value))}
                      className="h-8 pl-2 pr-6 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10"
                    >
                      {availableMonths.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  )}
                  <select
                    value={contributionYear}
                    onChange={(e) => setContributionYear(Number(e.target.value))}
                    className="h-8 pl-2 pr-6 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10"
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
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
                        `${value.toFixed(1)}% (LKR ${formatNumber(props.payload.pbt)})`,
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
                          <p className="text-slate-500">PBT</p>
                          <p className={`font-semibold ${cluster.pbt >= 0 ? "text-slate-800" : "text-red-600"}`}>
                            {formatNumber(cluster.pbt)}
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
              <Link 
                href="/md/risks" 
                className="flex items-center justify-center gap-1 py-3 text-sm text-[#0b1f3a] hover:underline font-medium"
              >
                View Full Risk Analysis <ChevronRight className="h-4 w-4" />
              </Link>
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
                  {formatNumber(selectedCluster.pbt)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">vs Budget</p>
                <p className={`text-xl font-bold ${selectedCluster.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {selectedCluster.variancePercent}%
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">YTD Forecast</p>
                <p className="text-xl font-bold text-slate-900">{formatShort(selectedCluster.forecast)}</p>
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

          {/* Companies List */}
          <div className="p-5">
            <h4 className="text-sm font-semibold text-slate-700 uppercase mb-3">
              Companies ({selectedCluster.companies.length})
            </h4>
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
                    <div className="grid grid-cols-3 gap-2 text-xs">
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
                      <div>
                        <p className="text-slate-500">Forecast</p>
                        <p className="font-semibold text-slate-700">{formatShort(company.forecast)}</p>
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
