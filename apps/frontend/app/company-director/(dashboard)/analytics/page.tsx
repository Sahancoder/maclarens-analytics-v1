"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Download, Building2 } from "lucide-react";

// Company Director's assigned company
const ASSIGNED_COMPANY = {
  code: "MMA",
  name: "McLarens Maritime Academy",
  cluster: "Shipping Services & Logistics",
  financialYear: "FY 2025-26",
};

// Monthly data for charts
const monthlyData = [
  { month: "Apr", actual: 980000, budget: 950000, variance: 30000 },
  { month: "May", actual: 1050000, budget: 1000000, variance: 50000 },
  { month: "Jun", actual: 920000, budget: 980000, variance: -60000 },
  { month: "Jul", actual: 1100000, budget: 1050000, variance: 50000 },
  { month: "Aug", actual: 1150000, budget: 1100000, variance: 50000 },
  { month: "Sep", actual: 1080000, budget: 1120000, variance: -40000 },
  { month: "Oct", actual: 1200000, budget: 1150000, variance: 50000 },
  { month: "Nov", actual: 1250000, budget: 1200000, variance: 50000 },
  { month: "Dec", actual: 1180000, budget: 1250000, variance: -70000 },
];

// Expense breakdown for pie chart
const expenseBreakdown = [
  { name: "Personal", value: 35, color: "#0b1f3a" },
  { name: "Admin", value: 25, color: "#1e40af" },
  { name: "Selling", value: 20, color: "#3b82f6" },
  { name: "Finance", value: 12, color: "#60a5fa" },
  { name: "Depreciation", value: 8, color: "#93c5fd" },
];

// KPI data
const kpiData = [
  { label: "YTD Actual Revenue", value: "10.91M", change: "+8.2%", trend: "up" },
  { label: "YTD Budget", value: "10.80M", change: "+1.0%", trend: "up" },
  { label: "YTD Variance", value: "110K", change: "+15.3%", trend: "up" },
  { label: "Achievement", value: "101.0%", change: "+2.1%", trend: "up" },
];

// Profitability trend
const profitabilityData = [
  { month: "Apr", gpMargin: 32.5, npMargin: 8.2 },
  { month: "May", gpMargin: 33.1, npMargin: 8.8 },
  { month: "Jun", gpMargin: 31.8, npMargin: 7.5 },
  { month: "Jul", gpMargin: 34.2, npMargin: 9.1 },
  { month: "Aug", gpMargin: 35.0, npMargin: 9.5 },
  { month: "Sep", gpMargin: 33.5, npMargin: 8.4 },
  { month: "Oct", gpMargin: 34.8, npMargin: 9.2 },
  { month: "Nov", gpMargin: 35.5, npMargin: 9.8 },
  { month: "Dec", gpMargin: 34.0, npMargin: 8.9 },
];

function KPICard({ label, value, change, trend }: { label: string; value: string; change: string; trend: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">{label}</span>
        {trend === "up" ? (
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className={`text-sm mt-1 ${trend === "up" ? "text-emerald-600" : "text-red-600"}`}>
        {change} vs last year
      </div>
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [year, setYear] = useState("2025-26");

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#0b1f3a]/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-[#0b1f3a]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{ASSIGNED_COMPANY.name}</h1>
              <p className="text-sm text-slate-500">Analytics Dashboard - {ASSIGNED_COMPANY.financialYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-10 px-4 text-sm border border-slate-300 rounded-lg"
            >
              <option value="2025-26">FY 2025-26</option>
              <option value="2024-25">FY 2024-25</option>
              <option value="2023-24">FY 2023-24</option>
            </select>
            <button className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpiData.map((kpi, i) => (
            <KPICard key={i} {...kpi} />
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Budget vs Actual Bar Chart */}
          <ChartCard
            title="Budget vs Actual Revenue"
            description="Monthly comparison of budgeted and actual revenue performance"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={formatCurrency} />
                  <Tooltip
                    formatter={(value: number) => [`LKR ${formatCurrency(value)}`, ""]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  <Bar dataKey="actual" name="Actual" fill="#0b1f3a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="budget" name="Budget" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Variance Trend Line Chart */}
          <ChartCard
            title="Variance Trend"
            description="Monthly deviation between actual and budgeted revenue"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={formatCurrency} />
                  <Tooltip
                    formatter={(value: number) => [`LKR ${formatCurrency(value)}`, "Variance"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="variance"
                    stroke="#10b981"
                    fill="#d1fae5"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Profitability Margins Line Chart */}
          <div className="lg:col-span-2">
            <ChartCard
              title="Profitability Margins"
              description="GP Margin and NP Margin trends over the financial year"
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitabilityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" unit="%" />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, ""]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="gpMargin"
                      name="GP Margin"
                      stroke="#0b1f3a"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="npMargin"
                      name="NP Margin"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Expense Breakdown Pie Chart */}
          <ChartCard
            title="Expense Breakdown"
            description="Distribution of operating expenses by category"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, ""]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {expenseBreakdown.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Monthly Comparison Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Monthly Performance Summary</h3>
            <p className="text-sm text-slate-500">Detailed breakdown of actual vs budget by month</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Month</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actual</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Budget</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Variance</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Achievement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthlyData.map((row, i) => {
                  const achievement = ((row.actual / row.budget) * 100).toFixed(1);
                  const isPositive = row.variance >= 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">{row.month}</td>
                      <td className="px-5 py-4 text-sm text-slate-700 text-right font-mono">
                        LKR {formatCurrency(row.actual)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 text-right font-mono">
                        LKR {formatCurrency(row.budget)}
                      </td>
                      <td className={`px-5 py-4 text-sm text-right font-mono ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                        {isPositive ? "+" : ""}LKR {formatCurrency(row.variance)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          parseFloat(achievement) >= 100
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {achievement}%
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
