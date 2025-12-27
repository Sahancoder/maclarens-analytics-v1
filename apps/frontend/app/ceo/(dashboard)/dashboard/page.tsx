"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  DollarSign,
  BarChart3,
} from "lucide-react";

// Group Health Index calculation
const groupHealthIndex = {
  score: 78,
  status: "good" as "excellent" | "good" | "warning" | "critical",
  components: [
    { name: "Revenue Growth", score: 82, weight: 25 },
    { name: "PBT Achievement", score: 85, weight: 30 },
    { name: "Variance Stability", score: 72, weight: 20 },
    { name: "Cash Generation", score: 75, weight: 15 },
    { name: "Risk Exposure", score: 68, weight: 10 },
  ],
};

// CEO KPIs (expanded beyond Executive)
const ceoKPIs = {
  groupPBT: { current: 847500, priorYear: 782000, change: 8.4 },
  ebitdaMargin: { current: 18.5, priorYear: 16.2, change: 2.3 },
  cashPositiveUnits: { positive: 38, negative: 8, total: 46 },
  ytdAchievement: { actual: 92.5, target: 100 },
};

// Top & Bottom Clusters
const topClusters = [
  { name: "Lube 01", pbt: 114600, contribution: 13.5, trend: "up" },
  { name: "Shipping Services", pbt: 97000, contribution: 11.4, trend: "up" },
  { name: "GAC Group", pbt: 109700, contribution: 12.9, trend: "stable" },
];

const riskClusters = [
  { name: "Bunkering", pbt: -45000, variance: -325, risk: "high" },
  { name: "Lube 02", pbt: -15000, variance: -214, risk: "high" },
  { name: "Strategic Investment", pbt: -5200, variance: -73, risk: "medium" },
];

// Recent Alerts
const recentAlerts = [
  { id: 1, type: "warning", message: "IOE Group variance exceeds threshold (-325%)", cluster: "Bunkering", time: "2 hours ago" },
  { id: 2, type: "info", message: "Q3 forecast revision pending approval", cluster: "Group", time: "5 hours ago" },
  { id: 3, type: "warning", message: "Carplan Lubricants underperforming YTD", cluster: "Lube 02", time: "1 day ago" },
  { id: 4, type: "success", message: "MLL-Automotive exceeded monthly target by 15%", cluster: "Lube 01", time: "1 day ago" },
];

// Cluster Performance Summary
const clusterSummary = [
  { name: "Liner", monthPBT: 125800, ytdPBT: 1258000, achievement: 103.2, trend: "up", risk: "low" },
  { name: "Ship Supply Services", monthPBT: 73100, ytdPBT: 731000, achievement: 101.5, trend: "stable", risk: "low" },
  { name: "Shipping Services & Logistics", monthPBT: 97000, ytdPBT: 970000, achievement: 108.9, trend: "up", risk: "low" },
  { name: "GAC Group", monthPBT: 109700, ytdPBT: 1097000, achievement: 99.7, trend: "stable", risk: "low" },
  { name: "Warehouse & Logistics", monthPBT: 44300, ytdPBT: 443000, achievement: 110.8, trend: "up", risk: "low" },
  { name: "Bunkering", monthPBT: -45000, ytdPBT: -450000, achievement: -225, trend: "down", risk: "high" },
  { name: "Hotel & Leisure", monthPBT: 8500, ytdPBT: 85000, achievement: 85, trend: "down", risk: "medium" },
  { name: "Property", monthPBT: 47800, ytdPBT: 478000, achievement: 103.5, trend: "stable", risk: "low" },
  { name: "Strategic Investment", monthPBT: -5200, ytdPBT: -52000, achievement: 173.3, trend: "down", risk: "medium" },
  { name: "Manufacturing", monthPBT: 40800, ytdPBT: 408000, achievement: 108.8, trend: "up", risk: "low" },
  { name: "Lube 01", monthPBT: 114600, ytdPBT: 1146000, achievement: 111.9, trend: "up", risk: "low" },
  { name: "Lube 02", monthPBT: -15000, ytdPBT: -150000, achievement: -103.4, trend: "down", risk: "high" },
];

const formatNumber = (num: number) => num.toLocaleString();
const formatCurrency = (num: number) => `LKR ${(num / 1000).toFixed(1)}M`;

export default function CEODashboard() {
  const [selectedYear] = useState("2025");
  const [selectedMonth] = useState("October");

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CEO Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Strategic Overview • {selectedMonth} {selectedYear}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Last updated: 2 hours ago</span>
          </div>
        </div>

        {/* Group Health Index + CEO KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6">
          {/* Group Health Index Gauge */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Group Health Index</h3>
              <Activity className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex items-center justify-center mb-4">
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={groupHealthIndex.score >= 80 ? "#10b981" : groupHealthIndex.score >= 60 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="12"
                    strokeDasharray={`${groupHealthIndex.score * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${getHealthColor(groupHealthIndex.score)}`}>{groupHealthIndex.score}</span>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {groupHealthIndex.components.slice(0, 3).map((comp) => (
                <div key={comp.name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{comp.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getHealthBg(comp.score)}`} style={{ width: `${comp.score}%` }} />
                    </div>
                    <span className="text-slate-700 font-medium w-8">{comp.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group PBT vs Prior Year */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700">Group PBT</h3>
              <DollarSign className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-[#0b1f3a]">{formatCurrency(ceoKPIs.groupPBT.current)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`flex items-center text-sm font-medium ${ceoKPIs.groupPBT.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {ceoKPIs.groupPBT.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {ceoKPIs.groupPBT.change}%
              </span>
              <span className="text-xs text-slate-500">vs Prior Year</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Prior Year</span>
                <span className="text-slate-700 font-medium">{formatCurrency(ceoKPIs.groupPBT.priorYear)}</span>
              </div>
            </div>
          </div>

          {/* EBITDA Margin */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700">EBITDA Margin</h3>
              <BarChart3 className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-[#0b1f3a]">{ceoKPIs.ebitdaMargin.current}%</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center text-sm font-medium text-emerald-600">
                <ArrowUpRight className="h-4 w-4" />
                +{ceoKPIs.ebitdaMargin.change}pp
              </span>
              <span className="text-xs text-slate-500">vs Prior Year</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Prior Year</span>
                <span className="text-slate-700 font-medium">{ceoKPIs.ebitdaMargin.priorYear}%</span>
              </div>
            </div>
          </div>

          {/* Cash Position */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700">Cash Position</h3>
              <Target className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-emerald-600">{ceoKPIs.cashPositiveUnits.positive}</p>
              <span className="text-sm text-slate-500">/ {ceoKPIs.cashPositiveUnits.total} units</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Cash-positive companies</p>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Cash-negative</span>
                <span className="text-red-600 font-medium">{ceoKPIs.cashPositiveUnits.negative} units</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Value Creators & Risk Clusters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Top 3 Value-Creating Clusters */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Top Value Creators</h3>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="space-y-3">
              {topClusters.map((cluster, idx) => (
                <div key={cluster.name} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{cluster.name}</p>
                      <p className="text-xs text-slate-500">{cluster.contribution}% contribution</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(cluster.pbt)}</p>
                    <p className="text-xs text-emerald-500">PBT</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 3 Risk Clusters */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Risk Clusters</h3>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="space-y-3">
              {riskClusters.map((cluster, idx) => (
                <div key={cluster.name} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`h-6 w-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${cluster.risk === "high" ? "bg-red-500" : "bg-amber-500"}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{cluster.name}</p>
                      <p className="text-xs text-red-600">{cluster.variance}% variance</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{formatCurrency(cluster.pbt)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${cluster.risk === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {cluster.risk}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/ceo/risks" className="flex items-center justify-center gap-1 mt-4 text-sm text-red-600 hover:text-red-700 font-medium">
              View Risk Analysis <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Recent Alerts</h3>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{recentAlerts.filter(a => a.type === "warning").length} warnings</span>
            </div>
            <div className="space-y-3">
              {recentAlerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                  alert.type === "warning" ? "bg-amber-50 border-l-amber-500" :
                  alert.type === "success" ? "bg-emerald-50 border-l-emerald-500" :
                  "bg-blue-50 border-l-blue-500"
                }`}>
                  <p className="text-xs font-medium text-slate-800">{alert.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">{alert.cluster}</span>
                    <span className="text-xs text-slate-400">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cluster Performance Overview */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Cluster Performance Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5">{selectedMonth} {selectedYear} • Click cluster for details</p>
            </div>
            <Link href="/ceo/performance" className="text-sm text-[#0b1f3a] hover:underline font-medium flex items-center gap-1">
              Full Analysis <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Cluster</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Month PBT</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">YTD PBT</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Achievement</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Trend</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Risk</th>
                </tr>
              </thead>
              <tbody>
                {clusterSummary.map((cluster) => (
                  <tr key={cluster.name} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-slate-800">{cluster.name}</td>
                    <td className={`px-4 py-3 text-right font-medium ${cluster.monthPBT >= 0 ? "text-slate-700" : "text-red-600"}`}>
                      {formatNumber(cluster.monthPBT)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${cluster.ytdPBT >= 0 ? "text-slate-700" : "text-red-600"}`}>
                      {formatNumber(cluster.ytdPBT)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${cluster.achievement >= 100 ? "text-emerald-600" : cluster.achievement >= 90 ? "text-amber-600" : "text-red-600"}`}>
                      {cluster.achievement > 0 ? cluster.achievement.toFixed(1) : cluster.achievement}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cluster.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto" />}
                      {cluster.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />}
                      {cluster.trend === "stable" && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        cluster.risk === "low" ? "bg-emerald-100 text-emerald-700" :
                        cluster.risk === "medium" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {cluster.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/ceo/performance" className="bg-white rounded-lg border border-slate-200 p-4 hover:border-[#0b1f3a] hover:shadow-md transition-all group">
            <TrendingUp className="h-6 w-6 text-[#0b1f3a] mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 group-hover:text-[#0b1f3a]">Performance Drivers</h4>
            <p className="text-xs text-slate-500 mt-1">Analyze what's driving results</p>
          </Link>
          <Link href="/ceo/risks" className="bg-white rounded-lg border border-slate-200 p-4 hover:border-[#0b1f3a] hover:shadow-md transition-all group">
            <AlertTriangle className="h-6 w-6 text-amber-500 mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 group-hover:text-[#0b1f3a]">Risk Intelligence</h4>
            <p className="text-xs text-slate-500 mt-1">Review variance classifications</p>
          </Link>
          <Link href="/ceo/forecast" className="bg-white rounded-lg border border-slate-200 p-4 hover:border-[#0b1f3a] hover:shadow-md transition-all group">
            <BarChart3 className="h-6 w-6 text-blue-500 mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 group-hover:text-[#0b1f3a]">Forecast View</h4>
            <p className="text-xs text-slate-500 mt-1">Year-end projections</p>
          </Link>
          <Link href="/ceo/scenarios" className="bg-white rounded-lg border border-slate-200 p-4 hover:border-[#0b1f3a] hover:shadow-md transition-all group">
            <Target className="h-6 w-6 text-purple-500 mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 group-hover:text-[#0b1f3a]">Scenario Modeling</h4>
            <p className="text-xs text-slate-500 mt-1">What-if analysis</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
