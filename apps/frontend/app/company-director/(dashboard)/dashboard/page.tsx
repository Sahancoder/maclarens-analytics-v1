"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, Building2, Download } from "lucide-react";

// Company Director's assigned company (from auth/session in real app)
const ASSIGNED_COMPANY = {
  code: "MMA",
  name: "McLarens Maritime Academy",
  cluster: "Shipping Services & Logistics",
  yearEnd: "March",
  financialYear: "FY 2025-26",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface FormData {
  revenue: string;
  gp: string;
  otherIncome: string;
  personalExpenses: string;
  adminExpenses: string;
  sellingExpenses: string;
  financialExpenses: string;
  depreciation: string;
  provisions: string;
  provisionsSign: "+" | "-";
  exchange: string;
  exchangeSign: "+" | "-";
  nonOpsExpenses: string;
  nonOpsIncome: string;
}

function InputField({
  label,
  value,
  onChange,
  isCompleted,
  sign,
  onSignChange,
  showSign,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isCompleted: boolean;
  sign?: "+" | "-";
  onSignChange?: (s: "+" | "-") => void;
  showSign?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-2">
        {showSign && (
          <button
            type="button"
            onClick={() => onSignChange?.(sign === "+" ? "-" : "+")}
            className={`h-11 w-11 rounded-lg text-lg font-bold border-2 transition-all flex items-center justify-center flex-shrink-0 ${
              sign === "+"
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-red-50 text-red-600 border-red-200"
            }`}
          >
            {sign}
          </button>
        )}
        <input
          type="text"
          value={value}
          placeholder="0.00"
          onChange={(e) => {
            if (e.target.value === "" || /^-?\d*\.?\d*$/.test(e.target.value))
              onChange(e.target.value);
          }}
          className={`flex-1 h-11 px-4 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a] ${
            isCompleted
              ? "border-emerald-300 bg-emerald-50/50"
              : "border-slate-300 bg-white hover:border-slate-400"
          }`}
        />
      </div>
    </div>
  );
}

function CalcField({
  label,
  value,
  isCompleted,
  suffix,
}: {
  label: string;
  value: string;
  isCompleted: boolean;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div
        className={`h-11 px-4 flex items-center text-sm font-semibold rounded-lg border transition-all ${
          isCompleted
            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
            : "bg-slate-100 text-slate-500 border-slate-200"
        }`}
      >
        {value}
        {suffix}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{title}</h3>
        {open ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>
      {open && <div className="px-6 pb-6 border-t border-slate-100 pt-5">{children}</div>}
    </div>
  );
}

export default function BudgetEntryPage() {
  const [month, setMonth] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [budgetData, setBudgetData] = useState<FormData>({
    revenue: "",
    gp: "",
    otherIncome: "",
    personalExpenses: "",
    adminExpenses: "",
    sellingExpenses: "",
    financialExpenses: "",
    depreciation: "",
    provisions: "",
    provisionsSign: "+",
    exchange: "",
    exchangeSign: "+",
    nonOpsExpenses: "",
    nonOpsIncome: "",
  });

  const update = useCallback((field: keyof FormData, value: string | "+" | "-") => {
    setBudgetData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const calc = useMemo(() => {
    const n = (v: string) => parseFloat(v) || 0;
    const revenue = n(budgetData.revenue);
    const gp = n(budgetData.gp);
    const otherIncome = n(budgetData.otherIncome);
    const personal = n(budgetData.personalExpenses);
    const admin = n(budgetData.adminExpenses);
    const selling = n(budgetData.sellingExpenses);
    const financial = n(budgetData.financialExpenses);
    const depreciation = n(budgetData.depreciation);
    const provisions = n(budgetData.provisions) * (budgetData.provisionsSign === "+" ? 1 : -1);
    const exchange = n(budgetData.exchange) * (budgetData.exchangeSign === "+" ? 1 : -1);
    const nonOpsExp = n(budgetData.nonOpsExpenses);
    const nonOpsInc = n(budgetData.nonOpsIncome);

    const gpMargin = revenue > 0 ? ((gp / revenue) * 100).toFixed(2) : "0.00";
    const totalOverheads = personal + admin + selling + financial + depreciation;
    const pbtBefore = gp + otherIncome - totalOverheads + provisions + exchange;
    const npMargin = revenue > 0 ? ((pbtBefore / revenue) * 100).toFixed(2) : "0.00";
    const pbtAfter = pbtBefore + nonOpsInc - nonOpsExp;
    const ebit = pbtAfter + financial;
    const ebitda = ebit + depreciation;

    return {
      gpMargin,
      totalOverheads: totalOverheads.toFixed(2),
      pbtBefore: pbtBefore.toFixed(2),
      npMargin,
      pbtAfter: pbtAfter.toFixed(2),
      ebit: ebit.toFixed(2),
      ebitda: ebitda.toFixed(2),
    };
  }, [budgetData]);

  const filled = (v: string) => v !== "" && !isNaN(parseFloat(v));
  const gpOk = filled(budgetData.revenue) && filled(budgetData.gp);
  const overheadsOk =
    filled(budgetData.personalExpenses) &&
    filled(budgetData.adminExpenses) &&
    filled(budgetData.sellingExpenses) &&
    filled(budgetData.financialExpenses) &&
    filled(budgetData.depreciation);
  const pbtBeforeOk =
    gpOk &&
    filled(budgetData.otherIncome) &&
    overheadsOk &&
    filled(budgetData.provisions) &&
    filled(budgetData.exchange);
  const pbtAfterOk = pbtBeforeOk && filled(budgetData.nonOpsExpenses) && filled(budgetData.nonOpsIncome);

  const progress = [
    { label: "Revenue", done: filled(budgetData.revenue) },
    { label: "Gross Profit", done: filled(budgetData.gp) },
    { label: "GP Margin", done: gpOk },
    { label: "Other Income", done: filled(budgetData.otherIncome) },
    { label: "Personal Exp", done: filled(budgetData.personalExpenses) },
    { label: "Admin Exp", done: filled(budgetData.adminExpenses) },
    { label: "Selling Exp", done: filled(budgetData.sellingExpenses) },
    { label: "Financial Exp", done: filled(budgetData.financialExpenses) },
    { label: "Depreciation", done: filled(budgetData.depreciation) },
    { label: "Total Overheads", done: overheadsOk },
    { label: "Provisions", done: filled(budgetData.provisions) },
    { label: "Exchange", done: filled(budgetData.exchange) },
    { label: "PBT Before", done: pbtBeforeOk },
    { label: "NP Margin", done: pbtBeforeOk },
    { label: "Non-Ops Exp", done: filled(budgetData.nonOpsExpenses) },
    { label: "Non-Ops Inc", done: filled(budgetData.nonOpsIncome) },
    { label: "PBT After", done: pbtAfterOk },
    { label: "EBIT", done: pbtAfterOk },
    { label: "EBITDA", done: pbtAfterOk },
  ];

  const completedCount = progress.filter((p) => p.done).length;
  const pct = Math.round((completedCount / progress.length) * 100);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Company Info Bar - Fixed (No Selection) */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#0b1f3a]/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-[#0b1f3a]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{ASSIGNED_COMPANY.name}</h2>
              <p className="text-sm text-slate-500">{ASSIGNED_COMPANY.cluster}</p>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase">Company Code</span>
            <span className="text-sm font-semibold text-slate-800">{ASSIGNED_COMPANY.code}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase">Financial Year</span>
            <span className="text-sm font-semibold text-slate-800">{ASSIGNED_COMPANY.financialYear}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase">Year End</span>
            <span className="text-sm font-semibold text-slate-800">{ASSIGNED_COMPANY.yearEnd}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase">Reporting Month</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
            >
              <option value="">Select Month</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Form Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-slate-900">Budget Report</h1>
            <p className="text-sm text-slate-500 mt-1">Enter budget figures for {month || "selected month"}</p>
          </div>

          <div className="space-y-5">
            <Section title="Revenue & Income (LKR)">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <InputField label="Revenue" value={budgetData.revenue} onChange={(v) => update("revenue", v)} isCompleted={filled(budgetData.revenue)} />
                <InputField label="Gross Profit (GP)" value={budgetData.gp} onChange={(v) => update("gp", v)} isCompleted={filled(budgetData.gp)} />
                <CalcField label="GP Margin" value={calc.gpMargin} isCompleted={gpOk} suffix="%" />
                <InputField label="Other Income" value={budgetData.otherIncome} onChange={(v) => update("otherIncome", v)} isCompleted={filled(budgetData.otherIncome)} />
              </div>
            </Section>

            <Section title="Operating Expenses (LKR)">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                <InputField label="Personal Related" value={budgetData.personalExpenses} onChange={(v) => update("personalExpenses", v)} isCompleted={filled(budgetData.personalExpenses)} />
                <InputField label="Admin & Establishment" value={budgetData.adminExpenses} onChange={(v) => update("adminExpenses", v)} isCompleted={filled(budgetData.adminExpenses)} />
                <InputField label="Selling & Distribution" value={budgetData.sellingExpenses} onChange={(v) => update("sellingExpenses", v)} isCompleted={filled(budgetData.sellingExpenses)} />
                <InputField label="Financial Expenses" value={budgetData.financialExpenses} onChange={(v) => update("financialExpenses", v)} isCompleted={filled(budgetData.financialExpenses)} />
                <InputField label="Depreciation" value={budgetData.depreciation} onChange={(v) => update("depreciation", v)} isCompleted={filled(budgetData.depreciation)} />
                <CalcField label="Total Overheads" value={calc.totalOverheads} isCompleted={overheadsOk} />
              </div>
            </Section>

            <Section title="Non-Operating Items (LKR)">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <InputField label="Provisions" value={budgetData.provisions} onChange={(v) => update("provisions", v)} isCompleted={filled(budgetData.provisions)} sign={budgetData.provisionsSign} onSignChange={(s) => update("provisionsSign", s)} showSign />
                <InputField label="Exchange (Loss/Gain)" value={budgetData.exchange} onChange={(v) => update("exchange", v)} isCompleted={filled(budgetData.exchange)} sign={budgetData.exchangeSign} onSignChange={(s) => update("exchangeSign", s)} showSign />
                <InputField label="Non-Operating Expenses" value={budgetData.nonOpsExpenses} onChange={(v) => update("nonOpsExpenses", v)} isCompleted={filled(budgetData.nonOpsExpenses)} />
                <InputField label="Non-Operating Income" value={budgetData.nonOpsIncome} onChange={(v) => update("nonOpsIncome", v)} isCompleted={filled(budgetData.nonOpsIncome)} />
              </div>
            </Section>

            <Section title="Auto-Calculated Metrics">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                <CalcField label="PBT Before Non-Ops" value={calc.pbtBefore} isCompleted={pbtBeforeOk} />
                <CalcField label="NP Margin" value={calc.npMargin} isCompleted={pbtBeforeOk} suffix="%" />
                <CalcField label="PBT After Non-Ops" value={calc.pbtAfter} isCompleted={pbtAfterOk} />
                <CalcField label="EBIT" value={calc.ebit} isCompleted={pbtAfterOk} />
                <CalcField label="EBITDA" value={calc.ebitda} isCompleted={pbtAfterOk} />
              </div>
            </Section>

            {/* Confirmation */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-[#0b1f3a] focus:ring-[#0b1f3a]"
                />
                <span className="text-sm text-slate-600">
                  I certify that I have reviewed the budget and confirm the figures are accurate and ready for submission.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pb-4">
              <button
                type="button"
                className="h-10 px-5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={!confirmed || !pbtAfterOk || !month}
                className="h-10 px-6 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Budget
              </button>
            </div>
          </div>
        </div>

        {/* Progress Panel */}
        <div className="hidden lg:flex w-60 bg-white border-l border-slate-200 flex-col h-full">
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800">Progress</span>
              <span className="text-sm font-bold text-emerald-600">{pct}%</span>
            </div>
            <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {completedCount} of {progress.length} completed
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              {progress.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full transition-all flex-shrink-0 ${
                      p.done ? "bg-emerald-400" : "bg-slate-300"
                    }`}
                  />
                  <span className={`text-sm ${p.done ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
