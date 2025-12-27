"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Cluster contribution data
const clusterContribution = [
  { name: "Lube 01", pbt: 114600, contribution: 19.2, momChange: 5.2, ytdMomentum: "accelerating" },
  { name: "GAC Group", pbt: 109700, contribution: 18.4, momChange: -1.2, ytdMomentum: "stable" },
  { name: "Shipping Services", pbt: 97000, contribution: 16.3, momChange: 8.5, ytdMomentum: "accelerating" },
  { name: "Liner", pbt: 125800, contribution: 21.1, momChange: 2.1, ytdMomentum: "stable" },
  { name: "Ship Supply", pbt: 73100, contribution: 12.3, momChange: -0.5, ytdMomentum: "stable" },
  { name: "Property", pbt: 47800, contribution: 8.0, momChange: 3.2, ytdMomentum: "improving" },
  { name: "Warehouse", pbt: 44300, contribution: 7.4, momChange: 6.8, ytdMomentum: "accelerating" },
  { name: "Manufacturing", pbt: 40800, contribution: 6.8, momChange: 4.1, ytdMomentum: "improving" },
  { name: "Hotel & Leisure", pbt: 8500, contribution: 1.4, momChange: -12.5, ytdMomentum: "declining" },
  { name: "Strategic Inv.", pbt: -5200, contribution: -0.9, momChange: -25.0, ytdMomentum: "declining" },
  { name: "Lube 02", pbt: -15000, contribution: -2.5, momChange: -45.2, ytdMomentum: "declining" },
  { name: "Bunkering", pbt: -45000, contribution: -7.5, momChange: -125.0, ytdMomentum: "critical" },
];

// Company impact data for selected cluster
const companyImpact: Record<string, Array<{ name: string; pbt: number; variance: number; impact: string }>> = {
  "Lube 01": [
    { name: "MLL- Automotive", pbt: 48500, variance: 6500, impact: "high-positive" },
    { name: "MLL- Industrial", pbt: 25600, variance: 3600, impact: "positive" },
    { name: "Mckupler", pbt: 18500, variance: 2500, impact: "positive" },
    { name: "3M", pbt: 12800, variance: -1200, impact: "negative" },
    { name: "Mcshaw Automotive", pbt: 9200, variance: 700, impact: "neutral" },
  ],
  "Bunkering": [
    { name: "IOE Group", pbt: -45000, variance: -65000, impact: "critical" },
  ],
  "GAC Group": [
    { name: "GSL", pbt: 42500, variance: 2500, impact: "positive" },
    { name: "MSL", pbt: 31200, variance: 3200, impact: "positive" },
    { name: "GAC Tug", pbt: 28900, variance: 3900, impact: "positive" },
    { name: "GLL", pbt: 15600, variance: -400, impact: "neutral" },
    { name: "GMSL", pbt: -8500, variance: -13500, impact: "critical" },
  ],
};

const formatNumber = (num: number) => num.toLocaleString();

export default function PerformancePage() {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"contribution" | "momentum">("contribution");

  const chartData = clusterContribution.map(c => ({
    name: c.name.length > 10 ? c.name.substring(0, 10) + "..." : c.name,
    fullName: c.name,
    value: viewMode === "contribution" ? c.contribution : c.momChange,
    pbt: c.pbt,
  }));

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Performance Drivers</h1>
          <p className="text-sm text-slate-500 mt-1">Understand what's driving Group performance</p>
        </div>

        {/* View Toggle */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-5">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600">View:</span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("contribution")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  viewMode === "contribution" ? "bg-[#0b1f3a] text-white" : "text-slate-600"
                }`}
              >
                Contribution %
              </button>
              <button
                onClick={() => setViewMode("momentum")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  viewMode === "momentum" ? "bg-[#0b1f3a] text-white" : "text-slate-600"
                }`}
              >
                MoM Change
              </button>
            </div>
          </div>
        </div>

        {/* Contribution Waterfall Chart */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 mb-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            {viewMode === "contribution" ? "Cluster Contribution to Group PBT" : "Month-over-Month Change"}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#0b1f3a" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cluster Cards with Drill-down */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          {clusterContribution.map((cluster) => {
            const isExpanded = selectedCluster === cluster.name;
            const companies = companyImpact[cluster.name] || [];
            return (
              <div key={cluster.name}>
                <div
                  onClick={() => setSelectedCluster(isExpanded ? null : cluster.name)}
                  className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
                    isExpanded ? "border-[#0b1f3a] ring-2 ring-[#0b1f3a]/10" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-800">{cluster.name}</h4>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">PBT</p>
                      <p className={`text-lg font-bold ${cluster.pbt >= 0 ? "text-slate-900" : "text-red-600"}`}>
                        {formatNumber(cluster.pbt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Contribution</p>
                      <p className={`text-lg font-bold ${cluster.contribution >= 0 ? "text-[#0b1f3a]" : "text-red-600"}`}>
                        {cluster.contribution}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">MoM Change</p>
                      <p className={`text-sm font-semibold flex items-center ${cluster.momChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {cluster.momChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {cluster.momChange >= 0 ? "+" : ""}{cluster.momChange}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Momentum</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        cluster.ytdMomentum === "accelerating" ? "bg-emerald-100 text-emerald-700" :
                        cluster.ytdMomentum === "improving" ? "bg-blue-100 text-blue-700" :
                        cluster.ytdMomentum === "stable" ? "bg-slate-100 text-slate-700" :
                        cluster.ytdMomentum === "declining" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {cluster.ytdMomentum}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Company Impact Drill-down */}
                {isExpanded && companies.length > 0 && (
                  <div className="mt-2 bg-slate-50 rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Company Impact Analysis</p>
                    <div className="space-y-2">
                      {companies.map((company) => (
                        <div key={company.name} className={`bg-white rounded-lg p-3 border ${
                          company.impact === "critical" ? "border-red-200" :
                          company.impact === "high-positive" ? "border-emerald-200" :
                          "border-slate-200"
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{company.name}</p>
                              <p className="text-xs text-slate-500">PBT: {formatNumber(company.pbt)}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${company.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {company.variance >= 0 ? "+" : ""}{formatNumber(company.variance)}
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                company.impact === "critical" ? "bg-red-100 text-red-700" :
                                company.impact === "high-positive" ? "bg-emerald-100 text-emerald-700" :
                                company.impact === "positive" ? "bg-blue-100 text-blue-700" :
                                company.impact === "negative" ? "bg-amber-100 text-amber-700" :
                                "bg-slate-100 text-slate-600"
                              }`}>
                                {company.impact}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
