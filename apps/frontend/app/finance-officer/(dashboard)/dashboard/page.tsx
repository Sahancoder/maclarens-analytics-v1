"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Check, ChevronDown, Search, ChevronUp, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { FOAPI } from "@/lib/api-client";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = ["2024", "2025", "2026"];

// Metric ID constants (matching backend metric_master)
const METRIC = {
  REVENUE: 1, GP: 2, GP_MARGIN: 3, OTHER_INCOME: 4,
  PERSONAL_EXP: 5, ADMIN_EXP: 6, SELLING_EXP: 7, FINANCE_EXP: 8,
  DEPRECIATION: 9, TOTAL_OVERHEAD: 10, PROVISIONS: 11, EXCHANGE: 12,
  PBT_BEFORE: 13, PBT_AFTER: 14, NON_OPS_EXP: 15, NON_OPS_INCOME: 16,
  NP_MARGIN: 17, EBIT: 18, EBITDA: 19,
};

interface FormData {
  revenue: string; gp: string; otherIncome: string;
  personalExpenses: string; adminExpenses: string; sellingExpenses: string;
  financialExpenses: string; depreciation: string;
  provisions: string;
  exchange: string;
  nonOpsExpenses: string; nonOpsIncome: string;
  comment: string;
}

interface ClusterItem {
  cluster_id: string;
  cluster_name: string;
}

interface CompanyItem {
  company_id: string;
  company_name: string;
  cluster_id: string;
  fin_year_start_month: number | null;
}


function Dropdown({ label, value, options, onChange, placeholder, disabled, searchable }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
  placeholder: string; disabled?: boolean; searchable?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setIsOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = searchable ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase())) : options;

  return (
    <div className="flex flex-col gap-2" ref={ref}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <button type="button" disabled={disabled} onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full h-11 px-4 text-left text-sm bg-white border rounded-lg flex items-center justify-between transition-all ${
            disabled ? "bg-slate-100 cursor-not-allowed text-slate-400 border-slate-200" : "border-slate-300 hover:border-slate-400 text-slate-900"
          } ${isOpen ? "border-[#0b1f3a] ring-2 ring-[#0b1f3a]/10" : ""}`}>
          <span className={value ? "text-slate-900" : "text-slate-400"}>{value || placeholder}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {searchable && (
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
                    className="w-full h-10 pl-10 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#0b1f3a]" autoFocus />
                </div>
              </div>
            )}
            <div className="overflow-y-auto max-h-48">
              {filtered.length === 0 ? <div className="px-4 py-3 text-sm text-slate-400">No results</div> : (
                filtered.map((opt) => (
                  <button key={opt} type="button" onClick={() => { onChange(opt); setIsOpen(false); setSearch(""); }}
                    className={`w-full h-11 px-4 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                      value === opt ? "bg-slate-50 text-[#0b1f3a] font-medium" : "text-slate-700"
                    }`}>
                    <span>{opt}</span>
                    {value === opt && <Check className="h-4 w-4 text-[#0b1f3a]" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EntryRow({ label, budget = "0.00", value, onChange, isCompleted }: {
  label: string; budget?: string; value: string; onChange: (v: string) => void; isCompleted: boolean;
}) {
  return (
    <div className="grid grid-cols-12 gap-4 items-center py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors rounded-lg px-2">
      <div className="col-span-12 sm:col-span-4 flex items-center">
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <div className="col-span-6 sm:col-span-4 relative">
         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">LKR</span>
         <div className="w-full h-10 pl-10 pr-3 flex items-center text-sm text-slate-500 bg-slate-100/50 border border-slate-200 rounded-lg">
            {budget}
         </div>
      </div>
      <div className="col-span-6 sm:col-span-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-slate-400 sm:text-sm">LKR</span>
        </div>
        <input type="text" value={value} placeholder="0.00"
          onChange={(e) => { if (e.target.value === "" || /^-?\d*\.?\d*$/.test(e.target.value)) onChange(e.target.value); }}
          className={`w-full h-10 pl-10 pr-3 text-sm font-medium border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a] ${
            isCompleted ? "border-emerald-300 bg-emerald-50/50 text-emerald-900" : "border-slate-300 bg-white hover:border-slate-400 text-slate-900"
          }`}
        />
      </div>
    </div>
  );
}

function GridHeader() {
  return (
    <div className="grid grid-cols-12 gap-4 mb-2 px-2 pb-2 border-b border-slate-200/60">
      <div className="col-span-12 sm:col-span-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metric / Line Item</span>
      </div>
      <div className="col-span-6 sm:col-span-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Budget (Admin)</span>
      </div>
      <div className="col-span-6 sm:col-span-4">
        <span className="text-xs font-bold text-[#0b1f3a] uppercase tracking-wider">Actual (Entry)</span>
      </div>
    </div>
  );
}

function CalcField({ label, value, isCompleted, suffix }: { label: string; value: string; isCompleted: boolean; suffix?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className={`h-11 px-4 flex items-center text-sm font-semibold rounded-lg border transition-all ${
        isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-200"
      }`}>
        {value}{suffix}
      </div>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{title}</h3>
        {open ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </button>
      {open && <div className="px-6 pb-6 border-t border-slate-100">{children}</div>}
    </div>
  );
}


function ConfirmModal({ isOpen, onClose, onConfirm, company, month, loading }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void; company: string; month: string; loading?: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Confirm Submission</h3>
          <button onClick={() => { onClose(); setConfirmed(false); }} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200 mb-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800">
              All required fields have been completed for <span className="font-semibold">{company}</span> - <span className="font-semibold">{month}</span>
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-slate-300 text-[#0b1f3a] focus:ring-[#0b1f3a]" />
            <span className="text-sm text-slate-600">
              I confirm that the financial data entered is accurate and ready for submission.
            </span>
          </label>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => { onClose(); setConfirmed(false); }}
            className="h-10 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); setConfirmed(false); }} disabled={!confirmed || loading}
            className="h-10 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Submitting..." : "Submit Data"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActualEntryPage() {
  // --- Selection state ---
  const [clusterName, setClusterName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // --- Data from backend ---
  const [clustersList, setClustersList] = useState<ClusterItem[]>([]);
  const [companiesList, setCompaniesList] = useState<CompanyItem[]>([]);
  const [budgetMetrics, setBudgetMetrics] = useState<Record<number, number> | null>(null);

  // --- Period warning ---
  const [periodWarning, setPeriodWarning] = useState<string | null>(null);
  const [periodAllowed, setPeriodAllowed] = useState(true);

  // --- UI state ---
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRejectedReport, setEditingRejectedReport] = useState<any>(null);

  // --- Form data ---
  const [formData, setFormData] = useState<FormData>({
    revenue: "", gp: "", otherIncome: "",
    personalExpenses: "", adminExpenses: "", sellingExpenses: "", financialExpenses: "", depreciation: "",
    provisions: "", exchange: "", nonOpsExpenses: "", nonOpsIncome: "",
    comment: "",
  });

  // --- Derived: selected company object ---
  const selectedCompany = useMemo(
    () => companiesList.find(c => c.company_name === companyName) || null,
    [companyName, companiesList]
  );

  // --- Derived: selected cluster_id ---
  const selectedClusterId = useMemo(
    () => clustersList.find(c => c.cluster_name === clusterName)?.cluster_id || null,
    [clusterName, clustersList]
  );

  // ==============================
  // 1. Fetch clusters on mount
  // ==============================
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await FOAPI.getUserClusters();
      if (!cancelled && res.data) {
        setClustersList(res.data);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ==============================
  // 2. Fetch companies when cluster changes
  // ==============================
  useEffect(() => {
    if (!selectedClusterId) {
      setCompaniesList([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await FOAPI.getUserCompanies(selectedClusterId);
      if (!cancelled && res.data) {
        setCompaniesList(res.data);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedClusterId]);

  // Reset company when cluster changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCompanyName("");
  }, [clusterName]);

  // ==============================
  // 3. Check period when year + month change (22-day rule)
  // ==============================
  useEffect(() => {
    if (!year || !month) {
      setPeriodWarning(null);
      setPeriodAllowed(true);
      return;
    }
    const monthIndex = MONTHS.indexOf(month) + 1;
    if (monthIndex <= 0) return;

    let cancelled = false;
    (async () => {
      const res = await FOAPI.checkPeriod(Number(year), monthIndex);
      if (!cancelled && res.data) {
        if (!res.data.allowed) {
          setPeriodWarning(res.data.message);
          setPeriodAllowed(false);
        } else {
          setPeriodWarning(null);
          setPeriodAllowed(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [year, month]);

  // ==============================
  // 4. Fetch budget data when company + year + month are set
  // ==============================
  useEffect(() => {
    if (!selectedCompany || !year || !month) {
      setBudgetMetrics(null);
      return;
    }
    const monthIndex = MONTHS.indexOf(month) + 1;
    if (monthIndex <= 0) {
      setBudgetMetrics(null);
      return;
    }

    let cancelled = false;
    (async () => {
      // Try financial_fact first
      const factRes = await FOAPI.getBudgetData(selectedCompany.company_id, Number(year), monthIndex);
      if (!cancelled && factRes.data && factRes.data.metrics) {
        setBudgetMetrics(factRes.data.metrics);
        return;
      }
      // Fallback to existing budget endpoint (view-based)
      if (!cancelled) {
        const viewRes = await FOAPI.getBudget(selectedCompany.company_id, Number(year), monthIndex);
        if (!cancelled && viewRes.data) {
          setBudgetMetrics({
            [METRIC.REVENUE]: viewRes.data.revenue_lkr || 0,
            [METRIC.GP]: viewRes.data.gp || 0,
            [METRIC.OTHER_INCOME]: viewRes.data.other_income || 0,
            [METRIC.PERSONAL_EXP]: viewRes.data.personal_exp || 0,
            [METRIC.ADMIN_EXP]: viewRes.data.admin_exp || 0,
            [METRIC.SELLING_EXP]: viewRes.data.selling_exp || 0,
            [METRIC.FINANCE_EXP]: viewRes.data.finance_exp || 0,
            [METRIC.DEPRECIATION]: viewRes.data.depreciation || 0,
            [METRIC.PROVISIONS]: viewRes.data.provisions || 0,
            [METRIC.EXCHANGE]: viewRes.data.exchange_gl || 0,
            [METRIC.NON_OPS_EXP]: viewRes.data.non_ops_exp || 0,
            [METRIC.NON_OPS_INCOME]: viewRes.data.non_ops_income || 0,
          });
        } else if (!cancelled) {
          setBudgetMetrics(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCompany, month, year]);

  // ==============================
  // Load rejected report or draft on mount
  // ==============================
  useEffect(() => {
    const storedReport = sessionStorage.getItem('editingRejectedReport');
    if (storedReport) {
      try {
        const reportData = JSON.parse(storedReport);
        setEditingRejectedReport(reportData);
        setFormData(reportData.formData);
        if (reportData.cluster) setClusterName(reportData.cluster);
        if (reportData.companyName) setCompanyName(reportData.companyName);
        const monthName = reportData.period?.split(' ')[0];
        if (monthName) setMonth(monthName);
        sessionStorage.removeItem('editingRejectedReport');
      } catch (error) {
        console.error('Error loading rejected report:', error);
      }
    } else {
      const savedDraft = localStorage.getItem("dataEntryDraft");
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          if (draftData.formData) {
            setFormData(draftData.formData);
            if (draftData.cluster) setClusterName(draftData.cluster);
            if (draftData.company) setCompanyName(draftData.company);
            if (draftData.month) setMonth(draftData.month);
            if (draftData.year) setYear(draftData.year);
          }
        } catch (e) {
          console.error("Error loading draft", e);
        }
      }
    }
  }, []);

  // ==============================
  // Handlers
  // ==============================
  const update = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const buildSavePayload = useCallback((isSubmit: boolean) => {
    if (!selectedCompany) return null;
    const monthIndex = MONTHS.indexOf(month) + 1;
    if (monthIndex <= 0 || !year) return null;

    const n = (v: string) => parseFloat(v) || 0;
    return {
      company_id: selectedCompany.company_id,
      year: Number(year),
      month: monthIndex,
      revenue: n(formData.revenue),
      gp: n(formData.gp),
      other_income: n(formData.otherIncome),
      personal_exp: n(formData.personalExpenses),
      admin_exp: n(formData.adminExpenses),
      selling_exp: n(formData.sellingExpenses),
      finance_exp: n(formData.financialExpenses),
      depreciation: n(formData.depreciation),
      provisions: n(formData.provisions),
      exchange_gl: n(formData.exchange),
      non_ops_exp: n(formData.nonOpsExpenses),
      non_ops_income: n(formData.nonOpsIncome),
      comment: formData.comment || undefined,
      is_submit: isSubmit,
    };
  }, [selectedCompany, year, month, formData]);

  const handleSaveDraft = async () => {
    // Save to localStorage as before
    const draftData = {
      cluster: clusterName,
      company: companyName,
      month,
      year,
      formData,
      lastModified: new Date().toISOString(),
    };
    localStorage.setItem("dataEntryDraft", JSON.stringify(draftData));

    // Also save to backend (status_id = 1 = Draft)
    const payload = buildSavePayload(false);
    if (payload) {
      setSaving(true);
      const res = await FOAPI.saveActuals(payload);
      setSaving(false);
      if (res.data?.success) {
        alert("Draft saved successfully!");
      } else {
        alert(`Draft saved locally. Backend: ${res.error || "Could not save to server."}`);
      }
    } else {
      alert("Draft saved locally!");
    }
  };

  const handleSubmit = async () => {
    setShowModal(false);
    const payload = buildSavePayload(true);
    if (!payload) {
      alert("Please select company, year, and month before submitting.");
      return;
    }

    setSaving(true);
    const res = await FOAPI.saveActuals(payload);
    setSaving(false);

    if (res.data?.success) {
      localStorage.removeItem("dataEntryDraft");
      alert("Actual data submitted to Finance Director for review!");
      // Reset form
      setFormData({
        revenue: "", gp: "", otherIncome: "",
        personalExpenses: "", adminExpenses: "", sellingExpenses: "", financialExpenses: "", depreciation: "",
        provisions: "", exchange: "", nonOpsExpenses: "", nonOpsIncome: "",
        comment: "",
      });
    } else {
      alert(`Submission failed: ${res.error || "Unknown error"}`);
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      setFormData({
        revenue: "", gp: "", otherIncome: "",
        personalExpenses: "", adminExpenses: "", sellingExpenses: "", financialExpenses: "", depreciation: "",
        provisions: "", exchange: "", nonOpsExpenses: "", nonOpsIncome: "",
        comment: "",
      });
    }
  };

  // ==============================
  // Budget display values
  // ==============================
  const formatBudget = (value: number | null | undefined) =>
    Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const budgetValues = useMemo(() => ({
    revenue: formatBudget(budgetMetrics?.[METRIC.REVENUE]),
    gp: formatBudget(budgetMetrics?.[METRIC.GP]),
    otherIncome: formatBudget(budgetMetrics?.[METRIC.OTHER_INCOME]),
    personalExpenses: formatBudget(budgetMetrics?.[METRIC.PERSONAL_EXP]),
    adminExpenses: formatBudget(budgetMetrics?.[METRIC.ADMIN_EXP]),
    sellingExpenses: formatBudget(budgetMetrics?.[METRIC.SELLING_EXP]),
    financialExpenses: formatBudget(budgetMetrics?.[METRIC.FINANCE_EXP]),
    depreciation: formatBudget(budgetMetrics?.[METRIC.DEPRECIATION]),
    provisions: formatBudget(budgetMetrics?.[METRIC.PROVISIONS]),
    exchange: formatBudget(budgetMetrics?.[METRIC.EXCHANGE]),
    nonOpsExpenses: formatBudget(budgetMetrics?.[METRIC.NON_OPS_EXP]),
    nonOpsIncome: formatBudget(budgetMetrics?.[METRIC.NON_OPS_INCOME]),
  }), [budgetMetrics]);

  // ==============================
  // Auto-calculated metrics
  // ==============================
  const calc = useMemo(() => {
    const n = (v: string) => parseFloat(v) || 0;
    const revenue = n(formData.revenue), gp = n(formData.gp), otherIncome = n(formData.otherIncome);
    const personal = n(formData.personalExpenses), admin = n(formData.adminExpenses), selling = n(formData.sellingExpenses);
    const financial = n(formData.financialExpenses), depreciation = n(formData.depreciation);
    const provisions = n(formData.provisions);
    const exchange = n(formData.exchange);
    const nonOpsExp = n(formData.nonOpsExpenses), nonOpsInc = n(formData.nonOpsIncome);

    const gpMargin = revenue > 0 ? ((gp / revenue) * 100).toFixed(2) : "0.00";
    const totalOverheads = personal + admin + selling + financial + depreciation;
    const pbtBefore = (gp + otherIncome) - totalOverheads + provisions + exchange;
    const npMargin = revenue > 0 ? ((pbtBefore / revenue) * 100).toFixed(2) : "0.00";
    const pbtAfter = pbtBefore + nonOpsInc - nonOpsExp;
    const ebit = pbtBefore + financial;
    const ebitda = ebit + depreciation;

    return { gpMargin, totalOverheads: totalOverheads.toFixed(2), pbtBefore: pbtBefore.toFixed(2), npMargin, pbtAfter: pbtAfter.toFixed(2), ebit: ebit.toFixed(2), ebitda: ebitda.toFixed(2) };
  }, [formData]);

  // ==============================
  // Progress tracking
  // ==============================
  const filled = (v: string) => v !== "" && !isNaN(parseFloat(v));
  const gpOk = filled(formData.revenue) && filled(formData.gp);
  const overheadsOk = filled(formData.personalExpenses) && filled(formData.adminExpenses) && filled(formData.sellingExpenses) && filled(formData.financialExpenses) && filled(formData.depreciation);
  const pbtBeforeOk = gpOk && filled(formData.otherIncome) && overheadsOk && filled(formData.provisions) && filled(formData.exchange);
  const pbtAfterOk = pbtBeforeOk && filled(formData.nonOpsExpenses) && filled(formData.nonOpsIncome);

  const progress = [
    { label: "Revenue", done: filled(formData.revenue) },
    { label: "Gross Profit", done: filled(formData.gp) },
    { label: "GP Margin", done: gpOk },
    { label: "Other Income", done: filled(formData.otherIncome) },
    { label: "Personal Exp", done: filled(formData.personalExpenses) },
    { label: "Admin Exp", done: filled(formData.adminExpenses) },
    { label: "Selling Exp", done: filled(formData.sellingExpenses) },
    { label: "Financial Exp", done: filled(formData.financialExpenses) },
    { label: "Depreciation", done: filled(formData.depreciation) },
    { label: "Total Overheads", done: overheadsOk },
    { label: "Provisions", done: filled(formData.provisions) },
    { label: "Exchange", done: filled(formData.exchange) },
    { label: "PBT Before", done: pbtBeforeOk },
    { label: "NP Margin", done: pbtBeforeOk },
    { label: "Non-Ops Exp", done: filled(formData.nonOpsExpenses) },
    { label: "Non-Ops Inc", done: filled(formData.nonOpsIncome) },
    { label: "PBT After", done: pbtAfterOk },
    { label: "EBIT", done: pbtAfterOk },
    { label: "EBITDA", done: pbtAfterOk },
  ];

  const completedCount = progress.filter(p => p.done).length;
  const pct = Math.round((completedCount / progress.length) * 100);

  // Dropdown options derived from backend data
  const clusterOptions = useMemo(() => clustersList.map(c => c.cluster_name), [clustersList]);
  const companyOptions = useMemo(() => companiesList.map(c => c.company_name), [companiesList]);


  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Rejected Report Alert Banner */}
      {editingRejectedReport && (
        <div className="bg-amber-50 border-b-2 border-amber-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-amber-800">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm font-semibold">Editing Rejected Report</span>
            </div>
            <div className="flex-1 text-sm text-amber-700">
              <span className="font-medium">{editingRejectedReport.companyName}</span> - {editingRejectedReport.period}
              <span className="mx-2">&bull;</span>
              <span className="italic">Rejection: {editingRejectedReport.rejectionReason?.substring(0, 80)}...</span>
            </div>
          </div>
        </div>
      )}

      {/* Period Warning Banner */}
      {periodWarning && (
        <div className="bg-red-50 border-b-2 border-red-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-red-800">{periodWarning}</span>
          </div>
        </div>
      )}


      {/* Selection Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Dropdown label="Cluster" value={clusterName} options={clusterOptions} onChange={setClusterName} placeholder="Select Cluster" searchable />
          <Dropdown label="Company" value={companyName} options={companyOptions} onChange={setCompanyName} placeholder="Select Company" disabled={!clusterName} searchable />
          <Dropdown label="Reporting Year" value={year} options={YEARS} onChange={setYear} placeholder="Select Year" disabled={!companyName} />
          <Dropdown label="Reporting Month" value={month} options={MONTHS} onChange={setMonth} placeholder="Select Month" disabled={!companyName} />
        </div>
        {selectedCompany && (
          <div className="mt-3 text-sm text-slate-500">Company Code: <span className="font-medium text-slate-800">{selectedCompany.company_id}</span></div>
        )}
      </div>

      {/* Main Content - Full Width */}
      <div className="flex-1 flex overflow-hidden">
        {/* Form Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            <Section title="Actual Revenue & Income">
              <div className="pt-4">
                <GridHeader />
                <div className="space-y-1">
                    <EntryRow label="Revenue" budget={budgetValues.revenue} value={formData.revenue} onChange={v => update("revenue", v)} isCompleted={filled(formData.revenue)} />
                    <EntryRow label="Gross Profit (GP)" budget={budgetValues.gp} value={formData.gp} onChange={v => update("gp", v)} isCompleted={filled(formData.gp)} />
                    <EntryRow label="Other Income" budget={budgetValues.otherIncome} value={formData.otherIncome} onChange={v => update("otherIncome", v)} isCompleted={filled(formData.otherIncome)} />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-12 gap-4">
                    <div className="col-span-12 sm:col-span-8 flex justify-end items-center">
                        <span className="text-sm font-semibold text-slate-700">GP Margin</span>
                    </div>
                    <div className="col-span-6 sm:col-span-4">
                         <div className={`h-9 px-3 flex items-center text-sm font-bold rounded-lg border ${gpOk ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                            {calc.gpMargin}%
                         </div>
                    </div>
                </div>
              </div>
            </Section>

            <Section title="Actual Operating Expenses">
              <div className="pt-4">
                <GridHeader />
                <div className="space-y-1">
                    <EntryRow label="Personal Related" budget={budgetValues.personalExpenses} value={formData.personalExpenses} onChange={v => update("personalExpenses", v)} isCompleted={filled(formData.personalExpenses)} />
                    <EntryRow label="Admin & Establishment" budget={budgetValues.adminExpenses} value={formData.adminExpenses} onChange={v => update("adminExpenses", v)} isCompleted={filled(formData.adminExpenses)} />
                    <EntryRow label="Selling & Distribution" budget={budgetValues.sellingExpenses} value={formData.sellingExpenses} onChange={v => update("sellingExpenses", v)} isCompleted={filled(formData.sellingExpenses)} />
                    <EntryRow label="Financial Expenses" budget={budgetValues.financialExpenses} value={formData.financialExpenses} onChange={v => update("financialExpenses", v)} isCompleted={filled(formData.financialExpenses)} />
                    <EntryRow label="Depreciation" budget={budgetValues.depreciation} value={formData.depreciation} onChange={v => update("depreciation", v)} isCompleted={filled(formData.depreciation)} />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-12 gap-4">
                    <div className="col-span-12 sm:col-span-8 flex justify-end items-center">
                        <span className="text-sm font-semibold text-slate-700">Total Overheads</span>
                    </div>
                    <div className="col-span-6 sm:col-span-4">
                         <div className={`h-9 px-3 flex items-center text-sm font-bold rounded-lg border ${overheadsOk ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                            {calc.totalOverheads}
                         </div>
                    </div>
                </div>
              </div>
            </Section>

            <Section title="Actual Non-Operating Items">
               <div className="pt-4">
                <GridHeader />
                <div className="space-y-1">
                    <EntryRow label="Provisions" budget={budgetValues.provisions} value={formData.provisions} onChange={v => update("provisions", v)} isCompleted={filled(formData.provisions)} />
                    <EntryRow label="Exchange (Loss/Gain)" budget={budgetValues.exchange} value={formData.exchange} onChange={v => update("exchange", v)} isCompleted={filled(formData.exchange)} />
                    <EntryRow label="Non-Operating Expenses" budget={budgetValues.nonOpsExpenses} value={formData.nonOpsExpenses} onChange={v => update("nonOpsExpenses", v)} isCompleted={filled(formData.nonOpsExpenses)} />
                    <EntryRow label="Non-Operating Income" budget={budgetValues.nonOpsIncome} value={formData.nonOpsIncome} onChange={v => update("nonOpsIncome", v)} isCompleted={filled(formData.nonOpsIncome)} />
                </div>
              </div>
            </Section>

            <Section title="Auto-Calculated Metrics">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 pt-5">
                <CalcField label="PBT Before Non-Ops" value={calc.pbtBefore} isCompleted={pbtBeforeOk} />
                <CalcField label="NP Margin" value={calc.npMargin} isCompleted={pbtBeforeOk} suffix="%" />
                <CalcField label="PBT After Non-Ops" value={calc.pbtAfter} isCompleted={pbtAfterOk} />
                <CalcField label="EBIT" value={calc.ebit} isCompleted={pbtAfterOk} />
                <CalcField label="EBITDA" value={calc.ebitda} isCompleted={pbtAfterOk} />
              </div>
            </Section>

            <Section title="Additional Comments">
              <div className="pt-5">
                <textarea
                  value={formData.comment}
                  onChange={(e) => update("comment", e.target.value)}
                  placeholder="Add any relevant notes or comments for the Finance Director..."
                  className="w-full h-32 px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a] resize-none placeholder:text-slate-400"
                />
              </div>
            </Section>
          </div>
        </div>

        {/* Progress Panel */}
        <div className="hidden lg:flex w-60 bg-white border-l border-slate-200 flex-col">
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800">Actual Progress</span>
              <span className="text-sm font-bold text-emerald-600">{pct}%</span>
            </div>
            <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{completedCount} of {progress.length} completed</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              {progress.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full transition-all flex-shrink-0 ${p.done ? "bg-emerald-400" : "bg-slate-300"}`} />
                  <span className={`text-sm ${p.done ? "text-emerald-700 font-medium" : "text-slate-500"}`}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Progress */}
      <div className="lg:hidden bg-white border-t border-slate-200 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700">Progress</span>
          <div className="flex-1 h-2.5 bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-bold text-emerald-600">{pct}%</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border-t border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={handleClear} className="h-10 px-4 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors">
            Clear
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={handleSaveDraft} disabled={saving}
              className="h-10 px-5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button type="button" onClick={() => setShowModal(true)} disabled={!pbtAfterOk || !companyName || !month || !year || !periodAllowed || saving}
              className="h-10 px-6 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Submit
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal isOpen={showModal} onClose={() => setShowModal(false)} onConfirm={handleSubmit} company={companyName} month={month} loading={saving} />
    </div>
  );
}
