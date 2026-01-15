"use client";

import { useState } from "react";
import { AlertTriangle, TrendingDown, Flag, MessageSquare, ChevronRight } from "lucide-react";

// Variance classifications
type VarianceType = "structural" | "seasonal" | "one-off" | "external";

interface VarianceItem {
  id: string;
  company: string;
  cluster: string;
  variance: number;
  variancePercent: number;
  type: VarianceType;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  recommendation: string;
}

const varianceData: VarianceItem[] = [
  { id: "1", company: "IOE Group", cluster: "Bunkering", variance: -65000, variancePercent: -325, type: "structural", severity: "critical", description: "Persistent underperformance due to market conditions and operational inefficiencies", recommendation: "Requires strategic review and potential restructuring" },
  { id: "2", company: "GMSL", cluster: "GAC Group", variance: -13500, variancePercent: -270, type: "structural", severity: "high", description: "Declining market share and increased competition", recommendation: "Review pricing strategy and cost structure" },
  { id: "3", company: "Interocean Lubricants", cluster: "Lube 02", variance: -17500, variancePercent: -350, type: "external", severity: "critical", description: "Raw material price increases and FX impact", recommendation: "Hedge FX exposure and renegotiate supplier contracts" },
  { id: "4", company: "Carplan Lubricants", cluster: "Lube 02", variance: -10500, variancePercent: -525, type: "structural", severity: "high", description: "Product line underperforming in competitive market", recommendation: "Consider product rationalization" },
  { id: "5", company: "MMA", cluster: "Shipping Services", variance: -4500, variancePercent: -225, type: "seasonal", severity: "medium", description: "Training intake lower than expected in Q3", recommendation: "Monitor Q4 enrollment trends" },
  { id: "6", company: "Topaz Hotels", cluster: "Hotel & Leisure", variance: -1500, variancePercent: -15, type: "seasonal", severity: "low", description: "Off-peak season impact", recommendation: "Expected to recover in Q4" },
  { id: "7", company: "MGML", cluster: "Strategic Investment", variance: -2200, variancePercent: -73, type: "one-off", severity: "medium", description: "One-time consulting and restructuring costs", recommendation: "Non-recurring, no action required" },
];

// Risk radar data
const riskRadar = [
  { cluster: "Bunkering", riskScore: 95, volatility: "high", contribution: -7.5, escalated: true },
  { cluster: "Lube 02", riskScore: 85, volatility: "high", contribution: -2.5, escalated: true },
  { cluster: "Strategic Investment", riskScore: 55, volatility: "medium", contribution: -0.9, escalated: false },
  { cluster: "Hotel & Leisure", riskScore: 45, volatility: "medium", contribution: 1.4, escalated: false },
  { cluster: "Ship Supply", riskScore: 25, volatility: "low", contribution: 12.3, escalated: false },
  { cluster: "GAC Group", riskScore: 35, volatility: "medium", contribution: 18.4, escalated: false },
];

const formatNumber = (num: number) => num.toLocaleString();

export default function RisksPage() {
  const [selectedType, setSelectedType] = useState<VarianceType | "all">("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  const filteredVariances = varianceData.filter(v => {
    if (selectedType !== "all" && v.type !== selectedType) return false;
    if (selectedSeverity !== "all" && v.severity !== selectedSeverity) return false;
    return true;
  });

  const criticalCount = varianceData.filter(v => v.severity === "critical").length;
  const highCount = varianceData.filter(v => v.severity === "high").length;

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Risk & Variance Intelligence</h1>
            <p className="text-sm text-slate-500 mt-1">Classified variance analysis and risk monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">{criticalCount} Critical</span>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">{highCount} High</span>
          </div>
        </div>

        {/* Risk Radar */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 mb-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4">CEO Risk Radar</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {riskRadar.map((item) => (
              <div
                key={item.cluster}
                className="p-4 rounded-lg border border-slate-200 bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-2xl font-bold ${
                    item.riskScore >= 80 ? "text-red-600" :
                    item.riskScore >= 50 ? "text-slate-700" :
                    "text-emerald-600"
                  }`}>
                    {item.riskScore}
                  </span>
                  {item.escalated && <Flag className="h-4 w-4 text-red-500" />}
                </div>
                <p className="text-xs font-medium text-slate-800 truncate">{item.cluster}</p>
                <p className="text-xs text-slate-500 mt-1">{item.contribution}% contrib.</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as VarianceType | "all")}
                className="h-9 px-3 text-sm border border-slate-300 rounded-lg"
              >
                <option value="all">All Types</option>
                <option value="structural">Structural</option>
                <option value="seasonal">Seasonal</option>
                <option value="one-off">One-off</option>
                <option value="external">External</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="h-9 px-3 text-sm border border-slate-300 rounded-lg"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Variance List */}
        <div className="space-y-4">
          {filteredVariances.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-base font-semibold text-slate-900">{item.company}</h4>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{item.cluster}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.type === "structural" ? "bg-purple-100 text-purple-700" :
                      item.type === "seasonal" ? "bg-blue-100 text-blue-700" :
                      item.type === "one-off" ? "bg-slate-100 text-slate-700" :
                      "bg-orange-100 text-orange-700"
                    }`}>
                      {item.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{item.description}</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Variance</p>
                      <p className="text-lg font-bold text-red-600">{formatNumber(item.variance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Variance %</p>
                      <p className="text-lg font-bold text-red-600">{item.variancePercent}%</p>
                    </div>
                    <div className="flex-1 ml-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs font-medium text-slate-600 mb-1">Recommendation</p>
                      <p className="text-sm text-slate-700">{item.recommendation}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded ${
                    item.severity === "critical" ? "bg-red-100 text-red-700" :
                    item.severity === "high" ? "bg-amber-100 text-amber-700" :
                    item.severity === "medium" ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {item.severity.toUpperCase()}
                  </span>
                  <button className="flex items-center gap-1 text-xs text-[#0b1f3a] hover:underline">
                    <Flag className="h-3 w-3" /> Escalate
                  </button>
                  <button className="flex items-center gap-1 text-xs text-[#0b1f3a] hover:underline">
                    <MessageSquare className="h-3 w-3" /> Comment
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
