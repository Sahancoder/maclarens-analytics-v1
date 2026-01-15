"use client";

import { TrendingUp, TrendingDown, Download } from "lucide-react";

interface FinancialStatement {
  revenue: number;
  revenueVsBudget: number;
  grossProfit: number;
  grossProfitMargin: number;
  totalOpex: number;
  opexVsBudget: number;
  ebit: number;
  ebitda: number;
  ebitdaMargin: number;
  pbt: number;
  pbtVsBudget: number;
  nonOpIncome: number;
  nonOpExpense: number;
  netNonOp: number;
}

interface FinancialMiniViewProps {
  companyName: string;
  companyCode: string;
  month: string;
  year: string;
  data: FinancialStatement;
}

export function FinancialMiniView({ companyName, companyCode, month, year, data }: FinancialMiniViewProps) {
  
  const formatCurrency = (num: number) => {
    const absNum = Math.abs(num);
    if (absNum >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (absNum >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatPercent = (num: number) => `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;

  const downloadFinancials = () => {
    const csv = [
      ["Financial Statement", companyName, `${month} ${year}`],
      [""],
      ["Line Item", "Amount (LKR)", "vs Budget %", "Margin %"],
      ["Revenue", data.revenue, data.revenueVsBudget, ""],
      ["Gross Profit", data.grossProfit, "", data.grossProfitMargin],
      ["Total OPEX", data.totalOpex, data.opexVsBudget, ""],
      ["EBIT", data.ebit, "", ""],
      ["EBITDA", data.ebitda, "", data.ebitdaMargin],
      ["Non-Op Income", data.nonOpIncome, "", ""],
      ["Non-Op Expense", data.nonOpExpense, "", ""],
      ["Net Non-Op", data.netNonOp, "", ""],
      ["PBT", data.pbt, data.pbtVsBudget, ""],
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${companyCode}_financials_${month}_${year}.csv`;
    a.click();
  };

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Financial Statement (Read-Only)</h4>
          <p className="text-xs text-slate-500 mt-0.5">{month} {year} • Accounting View</p>
        </div>
        <button
          onClick={downloadFinancials}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <div className="space-y-3">
        {/* Revenue */}
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600 uppercase">Revenue</span>
            <span className={`text-xs font-medium flex items-center gap-1 ${
              data.revenueVsBudget >= 0 ? "text-emerald-600" : "text-red-600"
            }`}>
              {data.revenueVsBudget >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatPercent(data.revenueVsBudget)} vs Budget
            </span>
          </div>
          <p className="text-lg font-bold text-[#0b1f3a]">LKR {formatCurrency(data.revenue)}</p>
        </div>

        {/* Gross Profit */}
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600 uppercase">Gross Profit</span>
            <span className="text-xs font-medium text-slate-500">
              {data.grossProfitMargin.toFixed(1)}% margin
            </span>
          </div>
          <p className={`text-lg font-bold ${data.grossProfit >= 0 ? "text-slate-800" : "text-red-600"}`}>
            LKR {formatCurrency(data.grossProfit)}
          </p>
        </div>

        {/* Total OPEX */}
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600 uppercase">Total OPEX</span>
            <span className={`text-xs font-medium flex items-center gap-1 ${
              data.opexVsBudget <= 0 ? "text-emerald-600" : "text-red-600"
            }`}>
              {data.opexVsBudget <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {formatPercent(data.opexVsBudget)} vs Budget
            </span>
          </div>
          <p className="text-lg font-bold text-slate-800">LKR {formatCurrency(data.totalOpex)}</p>
        </div>

        {/* EBIT / EBITDA */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <span className="text-xs font-medium text-slate-600 uppercase block mb-2">EBIT</span>
            <p className={`text-base font-bold ${data.ebit >= 0 ? "text-slate-800" : "text-red-600"}`}>
              {formatCurrency(data.ebit)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <span className="text-xs font-medium text-slate-600 uppercase block mb-2">EBITDA</span>
            <p className={`text-base font-bold ${data.ebitda >= 0 ? "text-slate-800" : "text-red-600"}`}>
              {formatCurrency(data.ebitda)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{data.ebitdaMargin.toFixed(1)}% margin</p>
          </div>
        </div>

        {/* Non-Operating Items */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <span className="text-xs font-semibold text-blue-800 uppercase block mb-2">Non-Operating Items</span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-blue-600 mb-1">Income</p>
              <p className="font-semibold text-emerald-700">+{formatCurrency(data.nonOpIncome)}</p>
            </div>
            <div>
              <p className="text-blue-600 mb-1">Expense</p>
              <p className="font-semibold text-red-600">-{formatCurrency(Math.abs(data.nonOpExpense))}</p>
            </div>
            <div>
              <p className="text-blue-600 mb-1">Net</p>
              <p className={`font-semibold ${data.netNonOp >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {formatCurrency(data.netNonOp)}
              </p>
            </div>
          </div>
        </div>

        {/* PBT (Final) */}
        <div className="bg-gradient-to-r from-[#0b1f3a] to-[#1e3a5f] rounded-lg p-4 border border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white uppercase">Profit Before Tax (PBT)</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              data.pbtVsBudget >= 0 
                ? "bg-emerald-500/20 text-emerald-200" 
                : "bg-red-500/20 text-red-200"
            }`}>
              {formatPercent(data.pbtVsBudget)} vs Budget
            </span>
          </div>
          <p className={`text-2xl font-bold ${
            data.pbt >= 0 ? "text-white" : "text-red-300"
          }`}>
            LKR {formatCurrency(data.pbt)}
          </p>
        </div>
      </div>

      {/* Accounting Note */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> This is a read-only accounting view. For detailed P&L breakdown, 
          please refer to the full financial report or contact the Finance team.
        </p>
      </div>
    </div>
  );
}
