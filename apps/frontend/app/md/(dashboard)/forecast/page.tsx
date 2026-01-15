"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// Forecast data
const forecastData = {
  yearEndTarget: 5200000,
  currentYTD: 4680000,
  projectedYearEnd: 5050000,
  gapToBudget: -150000,
  confidence: 85,
};

// Monthly trend data
const monthlyTrend = [
  { month: "Jan", actual: 420000, budget: 400000, forecast: null },
  { month: "Feb", actual: 445000, budget: 420000, forecast: null },
  { month: "Mar", actual: 480000, budget: 450000, forecast: null },
  { month: "Apr", actual: 465000, budget: 460000, forecast: null },
  { month: "May", actual: 490000, budget: 470000, forecast: null },
  { month: "Jun", actual: 475000, budget: 480000, forecast: null },
  { month: "Jul", actual: 510000, budget: 490000, forecast: null },
  { month: "Aug", actual: 495000, budget: 500000, forecast: null },
  { month: "Sep", actual: 520000, budget: 510000, forecast: null },
  { month: "Oct", actual: 480000, budget: 520000, forecast: null },
  { month: "Nov", actual: null, budget: 530000, forecast: 495000 },
  { month: "Dec", actual: null, budget: 540000, forecast: 510000 },
];

// Cluster forecasts
const clusterForecasts = [
  { name: "Liner", ytdActual: 1258000, yearEndForecast: 1510000, budget: 1440000, status: "on-track" },
  { name: "Ship Supply", ytdActual: 731000, yearEndForecast: 875000, budget: 900000, status: "at-risk" },
  { name: "Shipping Services", ytdActual: 970000, yearEndForecast: 1180000, budget: 1100000, status: "exceeding" },
  { name: "GAC Group", ytdActual: 1097000, yearEndForecast: 1300000, budget: 1320000, status: "on-track" },
  { name: "Warehouse", ytdActual: 443000, yearEndForecast: 540000, budget: 500000, status: "exceeding" },
  { name: "Bunkering", ytdActual: -450000, yearEndForecast: -520000, budget: 200000, status: "critical" },
  { name: "Hotel & Leisure", ytdActual: 85000, yearEndForecast: 95000, budget: 120000, status: "at-risk" },
  { name: "Property", ytdActual: 478000, yearEndForecast: 580000, budget: 550000, status: "exceeding" },
  { name: "Strategic Inv.", ytdActual: -52000, yearEndForecast: -60000, budget: -36000, status: "at-risk" },
  { name: "Manufacturing", ytdActual: 408000, yearEndForecast: 500000, budget: 450000, status: "exceeding" },
  { name: "Lube 01", ytdActual: 1146000, yearEndForecast: 1400000, budget: 1230000, status: "exceeding" },
  { name: "Lube 02", ytdActual: -150000, yearEndForecast: -180000, budget: 145000, status: "critical" },
];

const formatNumber = (num: number) => num.toLocaleString();
const formatCurrency = (num: number) => `LKR ${(num / 1000000).toFixed(2)}B`;

export default function ForecastPage() {
  const [forecastVersion] = useState("v3.2 - Oct 2025");

  const gapPercent = ((forecastData.projectedYearEnd - forecastData.yearEndTarget) / forecastData.yearEndTarget * 100).toFixed(1);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Forecast & Projections</h1>
            <p className="text-sm text-slate-500 mt-1">Rolling forecast and year-end projections</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Forecast Version:</span>
            <span className="px-3 py-1 bg-[#0b1f3a] text-white text-sm font-medium rounded">{forecastVersion}</span>
          </div>
        </div>

        {/* Forecast KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase">Year-End Target</p>
              <Target className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-[#0b1f3a]">{formatCurrency(forecastData.yearEndTarget)}</p>
            <p className="text-xs text-slate-500 mt-1">FY 2025 Budget</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase">Projected Year-End</p>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(forecastData.projectedYearEnd)}</p>
            <p className="text-xs text-slate-500 mt-1">{forecastData.confidence}% confidence</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase">Gap to Budget</p>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(forecastData.gapToBudget)}</p>
            <p className="text-xs text-amber-600 mt-1">{gapPercent}% below target</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase">YTD Actual</p>
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-700">{formatCurrency(forecastData.currentYTD)}</p>
            <p className="text-xs text-slate-500 mt-1">Oct 2025</p>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Monthly PBT Trend & Forecast</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: number) => formatNumber(value)} />
                <ReferenceLine y={forecastData.yearEndTarget / 12} stroke="#0b1f3a" strokeDasharray="5 5" label="Avg Target" />
                <Line type="monotone" dataKey="actual" stroke="#0b1f3a" strokeWidth={2} dot={{ fill: "#0b1f3a", r: 4 }} name="Actual" />
                <Line type="monotone" dataKey="budget" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "#94a3b8", r: 3 }} name="Budget" />
                <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" dot={{ fill: "#10b981", r: 4 }} name="Forecast" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2"><div className="h-3 w-6 bg-[#0b1f3a] rounded" /><span className="text-xs text-slate-600">Actual</span></div>
            <div className="flex items-center gap-2"><div className="h-3 w-6 bg-slate-400 rounded" /><span className="text-xs text-slate-600">Budget</span></div>
            <div className="flex items-center gap-2"><div className="h-3 w-6 bg-emerald-500 rounded" /><span className="text-xs text-slate-600">Forecast</span></div>
          </div>
        </div>

        {/* Cluster Forecasts Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Cluster Year-End Forecasts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Cluster</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">YTD Actual</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Year-End Forecast</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Budget</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Gap</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {clusterForecasts.map((cluster) => {
                  const gap = cluster.yearEndForecast - cluster.budget;
                  return (
                    <tr key={cluster.name} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{cluster.name}</td>
                      <td className={`px-4 py-3 text-right ${cluster.ytdActual >= 0 ? "text-slate-700" : "text-red-600"}`}>
                        {formatNumber(cluster.ytdActual)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${cluster.yearEndForecast >= 0 ? "text-slate-900" : "text-red-600"}`}>
                        {formatNumber(cluster.yearEndForecast)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatNumber(cluster.budget)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${gap >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {gap >= 0 ? "+" : ""}{formatNumber(gap)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          cluster.status === "exceeding" ? "bg-emerald-100 text-emerald-700" :
                          cluster.status === "on-track" ? "bg-blue-100 text-blue-700" :
                          cluster.status === "at-risk" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {cluster.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
