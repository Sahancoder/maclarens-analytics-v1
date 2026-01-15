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

// Finance Director's assigned company
const ASSIGNED_COMPANY = {
  code: "MMA",
  name: "McLarens Maritime Academy",
  cluster: "Shipping Services & Logistics",
  financialYear: "FY 2025-26",
};

// Monthly data for charts
// Monthly data for charts - PBT Comparison
const monthlyData = [
  { month: "Jan", pbtBefore: 850000, pbtAfter: 845000 },
  { month: "Feb", pbtBefore: 920000, pbtAfter: 920000 },
  { month: "Mar", pbtBefore: 880000, pbtAfter: 860000 },
  { month: "Apr", pbtBefore: 980000, pbtAfter: 975000 },
  { month: "May", pbtBefore: 1050000, pbtAfter: 1020000 },
  { month: "Jun", pbtBefore: 920000, pbtAfter: 915000 },
  { month: "Jul", pbtBefore: 1100000, pbtAfter: 1100000 },
  { month: "Aug", pbtBefore: 1150000, pbtAfter: 1120000 },
  { month: "Sep", pbtBefore: 1080000, pbtAfter: 1080000 },
  { month: "Oct", pbtBefore: 1200000, pbtAfter: 1190000 },
  { month: "Nov", pbtBefore: 1250000, pbtAfter: 1240000 },
  { month: "Dec", pbtBefore: 1180000, pbtAfter: 1150000 },
];

const yearlyData = [
  { year: "2023", pbtBefore: 12500000, pbtAfter: 12400000 },
  { year: "2024", pbtBefore: 13800000, pbtAfter: 13750000 },
  { year: "2025", pbtBefore: 14200000, pbtAfter: 14100000 },
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
// KPI data split
const monthlyKpiData = [
  { label: "GP Margin", value: "34.0%", change: "+1.5%", trend: "up" },
  { label: "GP", value: "4.2M", change: "+12.1%", trend: "up" },
  { label: "PBT Before", value: "1.1M", change: "+5.4%", trend: "up" },
  { label: "PBT Achievement", value: "105.2%", change: "+3.2%", trend: "up" },
];

const yearlyKpiData = [
  { label: "YTD GP Margin", value: "35.2%", change: "+8.5%", trend: "up" },
  { label: "YTD GP", value: "44.2M", change: "+12.3%", trend: "up" },
  { label: "YTD PBT Before", value: "12.5M", change: "+5.4%", trend: "up" },
  { label: "PBT Achievement (YTD)", value: "101.0%", change: "+2.1%", trend: "up" },
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
  const [month, setMonth] = useState("December");
  const [pbtViewMode, setPbtViewMode] = useState("monthly");

  // Table comparison state
  const [tableMonth, setTableMonth] = useState("Dec");
  const [tableYear, setTableYear] = useState("2025");

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
            <button className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        {/* Monthly Performance Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Monthly Performance</h3>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20"
            >
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {monthlyKpiData.map((kpi, i) => (
              <KPICard key={i} {...kpi} />
            ))}
          </div>
        </div>

        {/* Yearly Performance Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Yearly Performance (YTD)</h3>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-9 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20"
            >
              <option value="2025-26">FY 2025-26</option>
              <option value="2024-25">FY 2024-25</option>
              <option value="2023-24">FY 2023-24</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {yearlyKpiData.map((kpi, i) => (
              <KPICard key={i} {...kpi} />
            ))}
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Budget vs Actual Bar Chart */}
          {/* Actual PBT Comparison Chart */}
          <ChartCard
            title="Actual PBT Comparison (Before vs After)"
            description="Comparison of Profit Before Tax (PBT) before and after adjustments"
          >
            <div className="flex justify-end mb-4">
              <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium">
                <button
                  onClick={() => setPbtViewMode("monthly")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    pbtViewMode === "monthly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Monthly View
                </button>
                <button
                  onClick={() => setPbtViewMode("yearly")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    pbtViewMode === "yearly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Yearly View
                </button>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={pbtViewMode === "monthly" ? monthlyData : yearlyData} 
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey={pbtViewMode === "monthly" ? "month" : "year"} 
                    tick={{ fontSize: 12 }} 
                    stroke="#64748b" 
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={formatCurrency} />
                  <Tooltip
                    formatter={(value: number) => [`LKR ${formatCurrency(value)}`, ""]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  <Bar dataKey="pbtBefore" name="PBT Before" fill="#0b1f3a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pbtAfter" name="PBT After" fill="#0341a5ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Variance Trend Line Chart */}
          {/* Variance Trend Line Chart */}
          <ChartCard
            title="PBT Before – Monthly Trend"
            description="Monthly trend of Profit Before Tax (Pre-adjustment)"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={monthlyData} 
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={formatCurrency} />
                  <Tooltip
                    formatter={(value: number) => [`LKR ${formatCurrency(value)}`, "PBT Before"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  <Line
                    type="linear"
                    dataKey="pbtBefore"
                    name="PBT Before"
                    stroke="#0b1f3a"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    animationDuration={1500}
                  />
                </LineChart>
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
                      stroke="#3b82f6"
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

        {/* Comparative Performance Dashboard */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            
            {/* Monthly Section */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-slate-900 border-l-4 border-[#0b1f3a] pl-3">
                  Monthly Performance
                </h3>
                <select
                  value={tableMonth}
                  onChange={(e) => setTableMonth(e.target.value)}
                  className="h-9 px-3 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 transition-all cursor-pointer"
                >
                  <option value="Jan">January</option>
                  <option value="Feb">February</option>
                  <option value="Mar">March</option>
                  <option value="Apr">April</option>
                  <option value="May">May</option>
                  <option value="Jun">June</option>
                  <option value="Jul">July</option>
                  <option value="Aug">August</option>
                  <option value="Sep">September</option>
                  <option value="Oct">October</option>
                  <option value="Nov">November</option>
                  <option value="Dec">December</option>
                </select>
              </div>

              {(() => {
                const monthData = monthlyData.find(m => m.month === tableMonth) || monthlyData[0];
                const actual = monthData.pbtAfter;
                const budget = monthData.pbtBefore;
                const achievement = ((actual / budget) * 100);
                const isMeetingBudget = achievement >= 100;

                return (
                  <div className="grid grid-cols-3 gap-6">
                     <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actual PBT</p>
                      <p className="text-xl font-bold text-slate-900 font-mono">
                        LKR {formatCurrency(actual)}
                      </p>
                    </div>
                    <div className="space-y-1 border-l border-slate-100 pl-6">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Budget PBT</p>
                      <p className="text-xl font-bold text-slate-900 font-mono">
                        LKR {formatCurrency(budget)}
                      </p>
                    </div>
                    <div className="space-y-1 border-l border-slate-100 pl-6">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Achievement</p>
                      <div className={`flex items-baseline gap-1.5 ${isMeetingBudget ? "text-emerald-600" : "text-red-600"}`}>
                        <span className="text-xl font-bold">{achievement.toFixed(1)}%</span>
                        {isMeetingBudget ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Yearly Section */}
            <div className="p-6 bg-slate-50/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-slate-900 border-l-4 border-blue-600 pl-3">
                  Yearly Performance
                </h3>
                <select
                  value={tableYear}
                  onChange={(e) => setTableYear(e.target.value)}
                  className="h-9 px-3 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 transition-all cursor-pointer"
                >
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>

              {(() => {
                // Find year data or fallback to accumulated monthly data if current year
                const yearRecord = yearlyData.find(y => y.year === tableYear);
                
                // For demonstration, if specific year record exists use it, else sum monthly
                const actual = yearRecord ? yearRecord.pbtAfter : monthlyData.reduce((acc, curr) => acc + curr.pbtAfter, 0);
                const budget = yearRecord ? yearRecord.pbtBefore : monthlyData.reduce((acc, curr) => acc + curr.pbtBefore, 0);
                const achievement = ((actual / budget) * 100);
                const isMeetingBudget = achievement >= 100;

                return (
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actual PBT</p>
                      <p className="text-xl font-bold text-slate-900 font-mono">
                        LKR {formatCurrency(actual)}
                      </p>
                    </div>
                    <div className="space-y-1 border-l border-slate-200 pl-6">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Budget PBT</p>
                      <p className="text-xl font-bold text-slate-900 font-mono">
                        LKR {formatCurrency(budget)}
                      </p>
                    </div>
                    <div className="space-y-1 border-l border-slate-200 pl-6">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Achievement</p>
                      <div className={`flex items-baseline gap-1.5 ${isMeetingBudget ? "text-emerald-600" : "text-red-600"}`}>
                        <span className="text-xl font-bold">{achievement.toFixed(1)}%</span>
                        {isMeetingBudget ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
