"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Check, ChevronDown, Search, ChevronUp, X, CheckCircle2, Calculator, AlertCircle, FileSpreadsheet } from "lucide-react";
import { AdminAPI, type AdminCluster, type AdminCompany } from "@/lib/api-client";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface FormData {
  revenue: string; gp: string; otherIncome: string;
  personalExpenses: string; adminExpenses: string; sellingExpenses: string;
  financialExpenses: string; depreciation: string;
  provisions: string;
  exchange: string;
  nonOpsExpenses: string; nonOpsIncome: string;
  comment: string;
}

const FORM_TO_METRIC: Record<string, string> = {
  revenue: "revenue",
  gp: "gp",
  otherIncome: "other_income",
  personalExpenses: "personal_exp",
  adminExpenses: "admin_exp",
  sellingExpenses: "selling_exp",
  financialExpenses: "finance_exp",
  depreciation: "depreciation",
  provisions: "provisions",
  exchange: "exchange_variance",
  nonOpsExpenses: "non_ops_exp",
  nonOpsIncome: "non_ops_income",
};

const EMPTY_FORM: FormData = {
  revenue: "", gp: "", otherIncome: "",
  personalExpenses: "", adminExpenses: "", sellingExpenses: "", financialExpenses: "", depreciation: "",
  provisions: "", exchange: "", nonOpsExpenses: "", nonOpsIncome: "",
  comment: "",
};

function buildYearOptions(): string[] {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current - 3; y <= current + 5; y++) years.push(String(y));
  return years;
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

function InputField({ label, value, onChange, isCompleted }: {
  label: string; value: string; onChange: (v: string) => void; isCompleted: boolean;
}) {
  const formatVal = (v: string) => {
    if (!v) return "";
    const parts = v.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
      onChange(raw);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input type="text" value={formatVal(value)} placeholder="0.00"
        onChange={handleChange}
        className={`h-11 px-4 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a] ${
          isCompleted ? "border-emerald-300 bg-emerald-50/50" : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      />
    </div>
  );
}

function CalcField({ label, value, isCompleted, suffix }: { label: string; value: string; isCompleted: boolean; suffix?: string }) {
  const displayValue = value ? Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className={`h-11 px-4 flex items-center text-sm font-semibold rounded-lg border transition-all ${
        isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-200"
      }`}>
        {displayValue}{suffix}
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

function ConfirmModal({ isOpen, onClose, onConfirm, company, month, isUpdate, submitting }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void; company: string; month: string; isUpdate: boolean; submitting: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-[#0b1f3a]">{isUpdate ? "Confirm Actual Update" : "Confirm Actual Submission"}</h3>
          <button onClick={() => { onClose(); setConfirmed(false); }} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${isUpdate ? "bg-amber-50/50 border-amber-100" : "bg-emerald-50/50 border-emerald-100"}`}>
            {isUpdate ? (
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Calculator className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-xs text-slate-800 leading-snug">
              {isUpdate ? (
                <>You are about to <span className="font-semibold text-amber-700">update existing actuals</span> for <span className="font-semibold">{company}</span> - <span className="font-semibold">{month}</span></>
              ) : (
                <>All actual fields have been completed for <span className="font-semibold">{company}</span> - <span className="font-semibold">{month}</span></>
              )}
            </p>
          </div>
          <label className="flex items-start gap-3 p-1.5 hover:bg-slate-50 rounded cursor-pointer transition-all">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0b1f3a] focus:ring-[#0b1f3a]" />
            <span className="text-sm text-slate-600">
              {isUpdate
                ? "I confirm that the updated actual data is accurate and should replace the existing values."
                : "I confirm that the actual data entered is accurate and ready for reporting."
              }
            </span>
          </label>
        </div>
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={() => { onClose(); setConfirmed(false); }}
            className="h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); setConfirmed(false); }} disabled={!confirmed || submitting}
            className={`h-9 px-4 text-sm font-medium text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isUpdate ? "bg-amber-600 hover:bg-amber-700" : "bg-[#0b1f3a] hover:bg-[#0b1f3a]/90"
            }`}>
            {submitting ? "Submitting..." : isUpdate ? "Update Actuals" : "Submit Actuals"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActualEntryPage() {
  const [clusters, setClusters] = useState<AdminCluster[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const yearOptions = useMemo(() => buildYearOptions(), []);
  const metricToForm: Record<string, string> = useMemo(
    () => Object.fromEntries(Object.entries(FORM_TO_METRIC).map(([k, v]) => [v, k])),
    []
  );

  // Load clusters
  useEffect(() => {
    const load = async () => {
      const res = await AdminAPI.getClustersList();
      if (res.data) setClusters(res.data.clusters.filter((c) => c.is_active));

      // Check for resume from actual drafts
      const resumeRaw = sessionStorage.getItem("actualDraftResume");
      if (resumeRaw) {
        sessionStorage.removeItem("actualDraftResume");
        try {
          const resume = JSON.parse(resumeRaw) as { company_id: string; year: number; month: number };
          setYear(String(resume.year));
          setMonth(MONTHS[resume.month - 1]);
          setSelectedCompanyId(resume.company_id);
        } catch (e) {
          console.error("Failed to resume draft", e);
        }
      }
    };
    load();
  }, []);

  // Auto-select cluster when resuming
  useEffect(() => {
    if (!selectedCompanyId || selectedCluster || clusters.length === 0) return;
    const findCluster = async () => {
      const res = await AdminAPI.getCompaniesList({ page: 1, page_size: 500, is_active: true });
      if (!res.data) return;
      const comp = res.data.companies.find((c) => c.company_id === selectedCompanyId);
      if (comp) {
        const cl = clusters.find((c) => c.cluster_id === comp.cluster_id);
        if (cl) setSelectedCluster(cl.cluster_name);
      }
    };
    findCluster();
  }, [selectedCompanyId, clusters, selectedCluster]);

  // Load companies when cluster changes
  useEffect(() => {
    if (!selectedCluster) {
      setCompanies([]);
      return;
    }
    const cluster = clusters.find((c) => c.cluster_name === selectedCluster);
    if (!cluster) return;

    const load = async () => {
      const res = await AdminAPI.getCompaniesList({ page: 1, page_size: 500, cluster_id: cluster.cluster_id, is_active: true });
      if (res.data) {
        setCompanies(res.data.companies);
        if (selectedCompanyId && !selectedCompanyName) {
          const comp = res.data.companies.find((c) => c.company_id === selectedCompanyId);
          if (comp) setSelectedCompanyName(comp.company_name);
        }
      }
    };
    load();
  }, [selectedCluster, clusters]);

  // Auto-load existing actual data when company + year + month selected
  useEffect(() => {
    if (!selectedCompanyId || !year || !month) {
      setFormData(EMPTY_FORM);
      setHasExistingData(false);
      return;
    }

    const monthIndex = MONTHS.indexOf(month) + 1;
    if (monthIndex <= 0) return;

    const loadExisting = async () => {
      setLoadingData(true);
      const res = await AdminAPI.getActualEntry(selectedCompanyId, Number(year), monthIndex);
      setLoadingData(false);

      if (res.data && res.data.has_data) {
        const newForm: Record<string, string> = {};
        for (const [metricKey, amount] of Object.entries(res.data.metrics)) {
          const formKey = metricToForm[metricKey];
          if (formKey && amount !== null) {
            newForm[formKey] = String(amount);
          }
        }
        if (res.data.comment) newForm.comment = res.data.comment;
        setFormData({ ...EMPTY_FORM, ...newForm });
        setHasExistingData(true);
      } else {
        setFormData(EMPTY_FORM);
        setHasExistingData(false);
      }
    };
    loadExisting();
  }, [selectedCompanyId, year, month, metricToForm]);

  const clusterNames = useMemo(() => clusters.map((c) => c.cluster_name).sort(), [clusters]);
  const companyNames = useMemo(() => companies.map((c) => c.company_name), [companies]);

  const handleCompanyChange = (name: string) => {
    setSelectedCompanyName(name);
    const comp = companies.find((c) => c.company_name === name);
    setSelectedCompanyId(comp?.company_id || "");
    setError(null);
    setSuccess(null);
  };

  const handleClusterChange = (v: string) => {
    setSelectedCluster(v);
    setSelectedCompanyId("");
    setSelectedCompanyName("");
    setMonth("");
    setYear("");
    setError(null);
    setSuccess(null);
  };

  const update = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      setFormData(EMPTY_FORM);
    }
  };

  const buildMetrics = (): Record<string, number | null> => {
    const metrics: Record<string, number | null> = {};
    for (const [formKey, metricKey] of Object.entries(FORM_TO_METRIC)) {
      const val = formData[formKey as keyof FormData];
      metrics[metricKey] = val !== "" ? parseFloat(val) : null;
    }
    metrics["gp_margin"] = calc.gpMarginNum;
    metrics["total_overhead"] = calc.totalOverheadsNum;
    metrics["pbt_before_non_ops"] = calc.pbtBeforeNum;
    metrics["pbt_after_non_ops"] = calc.pbtAfterNum;
    metrics["np_margin"] = calc.npMarginNum;
    metrics["ebit"] = calc.ebitNum;
    metrics["ebitda"] = calc.ebitdaNum;
    return metrics;
  };

  const handleSaveDraft = async () => {
    if (!selectedCompanyId || !year || !month) {
      setError("Please select cluster, company, year and month before saving.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const monthIndex = MONTHS.indexOf(month) + 1;
    const res = await AdminAPI.saveActualDraft({
      company_id: selectedCompanyId,
      year: Number(year),
      month: monthIndex,
      metrics: buildMetrics(),
      comment: formData.comment || undefined,
    });

    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    setSuccess("Draft saved successfully!");
  };

  const handleSubmitActuals = async () => {
    if (!selectedCompanyId || !year || !month) return;
    setShowModal(false);
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const monthIndex = MONTHS.indexOf(month) + 1;
    const res = await AdminAPI.submitActualEntry({
      company_id: selectedCompanyId,
      year: Number(year),
      month: monthIndex,
      metrics: buildMetrics(),
      comment: formData.comment || undefined,
    });

    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    setSuccess(hasExistingData ? "Actuals updated successfully!" : "Actuals submitted successfully!");
    setHasExistingData(true);
  };

  const calc = useMemo(() => {
    const n = (v: string) => parseFloat(v) || 0;
    const revenue = n(formData.revenue), gp = n(formData.gp), otherIncome = n(formData.otherIncome);
    const personal = n(formData.personalExpenses), admin = n(formData.adminExpenses), selling = n(formData.sellingExpenses);
    const financial = n(formData.financialExpenses), depreciation = n(formData.depreciation);
    const provisions = n(formData.provisions), exchangeVal = n(formData.exchange);
    const nonOpsExp = n(formData.nonOpsExpenses), nonOpsInc = n(formData.nonOpsIncome);

    const gpMarginNum = revenue > 0 ? (gp / revenue) * 100 : 0;
    const totalOverheadsNum = personal + admin + selling + financial + depreciation;
    const pbtBeforeNum = (gp + otherIncome) - totalOverheadsNum + provisions + exchangeVal;
    const npMarginNum = revenue > 0 ? (pbtBeforeNum / revenue) * 100 : 0;
    const pbtAfterNum = pbtBeforeNum + nonOpsInc - nonOpsExp;
    const ebitNum = pbtBeforeNum + financial;
    const ebitdaNum = ebitNum + depreciation;

    return {
      gpMargin: gpMarginNum.toFixed(2), gpMarginNum,
      totalOverheads: totalOverheadsNum.toFixed(2), totalOverheadsNum,
      pbtBefore: pbtBeforeNum.toFixed(2), pbtBeforeNum,
      npMargin: npMarginNum.toFixed(2), npMarginNum,
      pbtAfter: pbtAfterNum.toFixed(2), pbtAfterNum,
      ebit: ebitNum.toFixed(2), ebitNum,
      ebitda: ebitdaNum.toFixed(2), ebitdaNum,
    };
  }, [formData]);

  const filled = (v: string) => v !== "" && !isNaN(parseFloat(v));
  const gpOk = filled(formData.revenue) && filled(formData.gp);
  const overheadsOk = filled(formData.personalExpenses) && filled(formData.adminExpenses) && filled(formData.sellingExpenses) && filled(formData.financialExpenses) && filled(formData.depreciation);
  const pbtBeforeOk = gpOk && filled(formData.otherIncome) && overheadsOk && filled(formData.provisions) && filled(formData.exchange);
  const pbtAfterOk = pbtBeforeOk && filled(formData.nonOpsExpenses) && filled(formData.nonOpsIncome);

  const progress = [
    { label: "Actual Revenue", done: filled(formData.revenue) },
    { label: "Actual GP", done: filled(formData.gp) },
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

  const completedCount = progress.filter((p) => p.done).length;
  const pct = Math.round((completedCount / progress.length) * 100);
  const isSelectionComplete = selectedCompanyId && month && year;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Selection Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Dropdown label="Cluster" value={selectedCluster} options={clusterNames} onChange={handleClusterChange} placeholder="Select Cluster" searchable />
          <Dropdown label="Company" value={selectedCompanyName} options={companyNames} onChange={handleCompanyChange} placeholder="Select Company" disabled={!selectedCluster} searchable />
          <Dropdown label="Reporting Year" value={year} options={yearOptions} onChange={(v) => { setYear(v); setError(null); setSuccess(null); }} placeholder="Select Year" disabled={!selectedCompanyName} />
          <Dropdown label="Reporting Month" value={month} options={MONTHS} onChange={(v) => { setMonth(v); setError(null); setSuccess(null); }} placeholder="Select Month" disabled={!selectedCompanyName} />
        </div>
        {selectedCompanyId && (
          <div className="mt-3 flex items-center gap-4">
            <span className="text-sm text-slate-500">Company ID: <span className="font-medium text-slate-800">{selectedCompanyId}</span></span>
            {isSelectionComplete && !loadingData && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                hasExistingData ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}>
                {hasExistingData ? (
                  <><CheckCircle2 className="h-3.5 w-3.5" /> Actuals Uploaded</>
                ) : (
                  <><FileSpreadsheet className="h-3.5 w-3.5" /> Not Yet Uploaded</>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      {error && <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {!isSelectionComplete ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Select Company and Period</h3>
                <p className="text-sm text-slate-500">Please select a cluster, company, year, and month to view or enter actual financial data.</p>
              </div>
            </div>
          ) : loadingData ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-slate-500">Loading existing data...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {hasExistingData && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Existing Actuals Loaded</p>
                    <p className="text-xs text-emerald-600 mt-0.5">This period has previously uploaded actuals. You can review and update the values below.</p>
                  </div>
                </div>
              )}

              <Section title="Actual Revenue & Income (LKR)">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
                  <InputField label="Actual Revenue" value={formData.revenue} onChange={(v) => update("revenue", v)} isCompleted={filled(formData.revenue)} />
                  <InputField label="Actual Gross Profit (GP)" value={formData.gp} onChange={(v) => update("gp", v)} isCompleted={filled(formData.gp)} />
                  <CalcField label="GP Margin" value={calc.gpMargin} isCompleted={gpOk} suffix="%" />
                  <InputField label="Other Income" value={formData.otherIncome} onChange={(v) => update("otherIncome", v)} isCompleted={filled(formData.otherIncome)} />
                </div>
              </Section>

              <Section title="Actual Operating Expenses (LKR)">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 pt-5">
                  <InputField label="Personal Related" value={formData.personalExpenses} onChange={(v) => update("personalExpenses", v)} isCompleted={filled(formData.personalExpenses)} />
                  <InputField label="Admin & Establishment" value={formData.adminExpenses} onChange={(v) => update("adminExpenses", v)} isCompleted={filled(formData.adminExpenses)} />
                  <InputField label="Selling & Distribution" value={formData.sellingExpenses} onChange={(v) => update("sellingExpenses", v)} isCompleted={filled(formData.sellingExpenses)} />
                  <InputField label="Financial Expenses" value={formData.financialExpenses} onChange={(v) => update("financialExpenses", v)} isCompleted={filled(formData.financialExpenses)} />
                  <InputField label="Depreciation" value={formData.depreciation} onChange={(v) => update("depreciation", v)} isCompleted={filled(formData.depreciation)} />
                  <CalcField label="Total Overheads" value={calc.totalOverheads} isCompleted={overheadsOk} />
                </div>
              </Section>

              <Section title="Actual Non-Operating Items (LKR)">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
                  <InputField label="Provisions" value={formData.provisions} onChange={(v) => update("provisions", v)} isCompleted={filled(formData.provisions)} />
                  <InputField label="Exchange (Loss/Gain)" value={formData.exchange} onChange={(v) => update("exchange", v)} isCompleted={filled(formData.exchange)} />
                  <InputField label="Non-Operating Expenses" value={formData.nonOpsExpenses} onChange={(v) => update("nonOpsExpenses", v)} isCompleted={filled(formData.nonOpsExpenses)} />
                  <InputField label="Non-Operating Income" value={formData.nonOpsIncome} onChange={(v) => update("nonOpsIncome", v)} isCompleted={filled(formData.nonOpsIncome)} />
                </div>
              </Section>

              <Section title="Auto-Calculated Actual Metrics">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 pt-5">
                  <CalcField label="PBT Before Non-Ops" value={calc.pbtBefore} isCompleted={pbtBeforeOk} />
                  <CalcField label="NP Margin" value={calc.npMargin} isCompleted={pbtBeforeOk} suffix="%" />
                  <CalcField label="PBT After Non-Ops" value={calc.pbtAfter} isCompleted={pbtAfterOk} />
                  <CalcField label="EBIT" value={calc.ebit} isCompleted={pbtAfterOk} />
                  <CalcField label="EBITDA" value={calc.ebitda} isCompleted={pbtAfterOk} />
                </div>
              </Section>

              <Section title="Actual Comment">
                <div className="pt-5">
                  <textarea
                    value={formData.comment}
                    onChange={(e) => update("comment", e.target.value)}
                    placeholder="Add any relevant notes or comments regarding the actuals..."
                    className="w-full h-32 px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a] resize-none placeholder:text-slate-400"
                  />
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Progress Panel */}
        {isSelectionComplete && !loadingData && (
          <div className="hidden lg:flex w-60 bg-white border-l border-slate-200 flex-col">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-800">Actual Progress</span>
                <span className="text-sm font-bold text-emerald-600">{pct}%</span>
              </div>
              <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{completedCount} of {progress.length} completed</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                {progress.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full transition-all flex-shrink-0 ${p.done ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className={`text-sm ${p.done ? "text-emerald-700 font-medium" : "text-slate-500"}`}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Progress */}
      {isSelectionComplete && !loadingData && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Actual Progress</span>
            <div className="flex-1 h-2.5 bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-bold text-emerald-600">{pct}%</span>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {isSelectionComplete && !loadingData && (
        <div className="bg-white border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={handleClear} className="h-10 px-4 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors">
              Clear
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="h-10 px-5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Save Draft"}
              </button>
              <button type="button" onClick={() => setShowModal(true)} disabled={!pbtAfterOk || submitting}
                className={`h-10 px-6 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasExistingData ? "bg-amber-600 hover:bg-amber-700" : "bg-[#0b1f3a] hover:bg-[#0b1f3a]/90"
                }`}>
                {hasExistingData ? "Update Actuals" : "Submit Actuals"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleSubmitActuals}
        company={selectedCompanyName}
        month={`${month} ${year}`}
        isUpdate={hasExistingData}
        submitting={submitting}
      />
    </div>
  );
}
