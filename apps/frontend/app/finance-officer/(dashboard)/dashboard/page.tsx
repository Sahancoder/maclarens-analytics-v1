"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Check, ChevronDown, Search, ChevronUp, X, CheckCircle2, FileText } from "lucide-react";

const COMPANIES_DATA = [
  { code: "ONE", name: "ONE", cluster: "Liner", yearEnd: "March", isActive: true },
  { code: "UMI", name: "UMI", cluster: "Liner", yearEnd: "March", isActive: true },
  { code: "MSC", name: "MSC", cluster: "Liner", yearEnd: "December", isActive: true },
  { code: "MMA", name: "McLarens Maritime Academy", cluster: "Shipping Services & Logistics", yearEnd: "March", isActive: true },
  { code: "MOL", name: "M O L Logistics Lanka", cluster: "Shipping Services & Logistics", yearEnd: "December", isActive: true },
  { code: "CHR", name: "C.H. Robinson Worldwide", cluster: "Shipping Services & Logistics", yearEnd: "March", isActive: true },
  { code: "SwiftShipping", name: "Swift Shipping Services", cluster: "Shipping Services & Logistics", yearEnd: "March", isActive: true },
  { code: "UnitedMaritime", name: "United Maritime", cluster: "Shipping Services & Logistics", yearEnd: "March", isActive: true },
  { code: "Shermans", name: "Shermans Logistics", cluster: "Shipping Services & Logistics", yearEnd: "March", isActive: true },
  { code: "GMSL", name: "GAC Marine Services", cluster: "GAC Cluster", yearEnd: "December", isActive: true },
  { code: "GSL", name: "GAC Shipping Limited", cluster: "GAC Cluster", yearEnd: "December", isActive: true },
  { code: "GACTugs", name: "GAC Tugs", cluster: "GAC Cluster", yearEnd: "December", isActive: true },
  { code: "MSL", name: "McLarens Shipping Ltd", cluster: "GAC Cluster", yearEnd: "December", isActive: true },
  { code: "GLL", name: "GAC Logistics Ltd", cluster: "GAC Cluster", yearEnd: "December", isActive: true },
  { code: "SPIL", name: "Spectra Integrated Logistics", cluster: "Warehouse & Logistics", yearEnd: "March", isActive: true },
  { code: "SPL", name: "Spectra Logistics", cluster: "Warehouse & Logistics", yearEnd: "March", isActive: true },
  { code: "IOSM", name: "Interocean Ship Management", cluster: "Ship Supply Services", yearEnd: "March", isActive: true },
  { code: "AMOS", name: "Amos International Lanka", cluster: "Ship Supply Services", yearEnd: "March", isActive: true },
  { code: "CTL", name: "Continental Tech Services", cluster: "Ship Supply Services", yearEnd: "March", isActive: true },
  { code: "WOSS", name: "World Subsea Services", cluster: "Ship Supply Services", yearEnd: "March", isActive: true },
  { code: "MLL-Auto", name: "McLarens Lubricants - Auto", cluster: "Lubricant I", yearEnd: "December", isActive: true },
  { code: "McKupler", name: "McKupler Inc", cluster: "Lubricant I", yearEnd: "December", isActive: true },
  { code: "Carplan", name: "Carplan Lubricants", cluster: "Lubricant II", yearEnd: "March", isActive: true },
  { code: "Yantrataksan", name: "Yantrataksan Technologies", cluster: "Manufacturing", yearEnd: "March", isActive: true },
  { code: "Pidilite", name: "Pidilite Lanka", cluster: "Manufacturing", yearEnd: "March", isActive: true },
  { code: "Macbertan", name: "Macbertan", cluster: "Manufacturing", yearEnd: "March", isActive: true },
  { code: "IOE", name: "Interocean Energy", cluster: "Bunkering & Renewables", yearEnd: "March", isActive: true },
  { code: "GAHL", name: "Galle Agency House", cluster: "Property", yearEnd: "March", isActive: true },
  { code: "MAL", name: "McLarens Automotive", cluster: "Property", yearEnd: "March", isActive: true },
  { code: "MDL", name: "McLarens Developers", cluster: "Property", yearEnd: "March", isActive: true },
  { code: "Topas", name: "Topaz Hotels", cluster: "Hotel & Leisure", yearEnd: "March", isActive: true },
  { code: "MGML", name: "McLarens Group Management", cluster: "Strategic Investment", yearEnd: "March", isActive: true },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface FormData {
  revenue: string; gp: string; otherIncome: string;
  personalExpenses: string; adminExpenses: string; sellingExpenses: string;
  financialExpenses: string; depreciation: string;
  provisions: string; provisionsSign: "+" | "-";
  exchange: string; exchangeSign: "+" | "-";
  nonOpsExpenses: string; nonOpsIncome: string;
  comment: string;
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

function InputField({ label, value, onChange, isCompleted, sign, onSignChange, showSign }: {
  label: string; value: string; onChange: (v: string) => void; isCompleted: boolean;
  sign?: "+" | "-"; onSignChange?: (s: "+" | "-") => void; showSign?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-2">
        {showSign && (
          <button type="button" onClick={() => onSignChange?.(sign === "+" ? "-" : "+")}
            className={`h-11 w-11 rounded-lg text-lg font-bold border-2 transition-all flex items-center justify-center ${
              sign === "+" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"
            }`}>
            {sign}
          </button>
        )}
        <input type="text" value={value} placeholder="0.00"
          onChange={(e) => { if (e.target.value === "" || /^-?\d*\.?\d*$/.test(e.target.value)) onChange(e.target.value); }}
          className={`flex-1 h-11 px-4 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a] ${
            isCompleted ? "border-emerald-300 bg-emerald-50/50" : "border-slate-300 bg-white hover:border-slate-400"
          }`}
        />
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


function ConfirmModal({ isOpen, onClose, onConfirm, company, month }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void; company: string; month: string;
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
          <button onClick={() => { onConfirm(); setConfirmed(false); }} disabled={!confirmed}
            className="h-10 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Submit Data
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActualEntryPage() {
  const [cluster, setCluster] = useState("");
  const [company, setCompany] = useState("");
  const [month, setMonth] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRejectedReport, setEditingRejectedReport] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    revenue: "", gp: "", otherIncome: "",
    personalExpenses: "", adminExpenses: "", sellingExpenses: "", financialExpenses: "", depreciation: "",
    provisions: "", provisionsSign: "+", exchange: "", exchangeSign: "+", nonOpsExpenses: "", nonOpsIncome: "",
    comment: "",
  });

  // Check for rejected report data on component mount
  // Check for rejected report data OR draft data on component mount
  useEffect(() => {
    const storedReport = sessionStorage.getItem('editingRejectedReport');
    if (storedReport) {
      try {
        const reportData = JSON.parse(storedReport);
        setEditingRejectedReport(reportData);
        setFormData(reportData.formData);
        
        const companyInfo = COMPANIES_DATA.find(c => c.code === reportData.companyCode);
        if (companyInfo) {
          setCluster(reportData.cluster);
          setCompany(reportData.companyName);
        }
        
        const monthName = reportData.period.split(' ')[0];
        setMonth(monthName);
        sessionStorage.removeItem('editingRejectedReport');
      } catch (error) {
        console.error('Error loading rejected report:', error);
      }
    } else {
      // Check for saved draft if not editing a rejected report
      const savedDraft = localStorage.getItem("dataEntryDraft");
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          // Only load if it looks like our data
          if (draftData.formData) {
            setFormData(draftData.formData);
            if (draftData.cluster) setCluster(draftData.cluster);
            if (draftData.company) setCompany(draftData.company);
            if (draftData.month) setMonth(draftData.month);
          }
        } catch (e) {
          console.error("Error loading draft", e);
        }
      }
    }
  }, []);

  const clusters = useMemo(() => Array.from(new Set(COMPANIES_DATA.filter(c => c.isActive).map(c => c.cluster))).sort(), []);
  const companies = useMemo(() => cluster ? COMPANIES_DATA.filter(c => c.isActive && c.cluster === cluster) : [], [cluster]);
  const companyData = useMemo(() => COMPANIES_DATA.find(c => c.name === company), [company]);
  const financialYear = useMemo(() => companyData ? (companyData.yearEnd === "December" ? "FY 2025" : "FY 2025-26") : "", [companyData]);

  useEffect(() => { 
    // Only reset company if the new cluster doesn't contain the current company
    // But since companies is derived from cluster, if cluster changes, companies changes.
    // We should check if current company is valid for new cluster.
    const isValid = COMPANIES_DATA.some(c => c.name === company && c.cluster === cluster);
    if (!isValid) setCompany(""); 
  }, [cluster, company]); // Added company dependency to satisfy exhaustive-deps, though logic slighty changed from original `useEffect(() => { setCompany(""); }, [cluster]);` which blindly reset.
  // Actually, let's keep original behavior but strictly cleaner if needed. 
  // The original was: useEffect(() => { setCompany(""); }, [cluster]); 
  // If we behave like original:
  // useEffect(() => { setCompany(""); }, [cluster]); 
  // using saved draft might set cluster then company. If we strictly follow react, setting cluster triggers this.
  // We need to be careful not to clear company immediately after loading draft.
  // The loading logic sets both. React batching might help, or we might need a ref to skip first reset.
  
  // Ref to track if initial load happened to avoid clearing company
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCompany("");
  }, [cluster]);

  const update = useCallback((field: keyof FormData, value: string | "+" | "-") => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveDraft = () => {
    const draftData = {
      cluster,
      company,
      month,
      formData,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem("dataEntryDraft", JSON.stringify(draftData));
    alert("Draft saved successfully!");
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      setFormData({
        revenue: "", gp: "", otherIncome: "",
        personalExpenses: "", adminExpenses: "", sellingExpenses: "", financialExpenses: "", depreciation: "",
        provisions: "", provisionsSign: "+", exchange: "", exchangeSign: "+", nonOpsExpenses: "", nonOpsIncome: "",
        comment: "",
      });
    }
  };

  const calc = useMemo(() => {
    const n = (v: string) => parseFloat(v) || 0;
    const revenue = n(formData.revenue), gp = n(formData.gp), otherIncome = n(formData.otherIncome);
    const personal = n(formData.personalExpenses), admin = n(formData.adminExpenses), selling = n(formData.sellingExpenses);
    const financial = n(formData.financialExpenses), depreciation = n(formData.depreciation);
    const provisions = n(formData.provisions) * (formData.provisionsSign === "+" ? 1 : -1);
    const exchange = n(formData.exchange) * (formData.exchangeSign === "+" ? 1 : -1);
    const nonOpsExp = n(formData.nonOpsExpenses), nonOpsInc = n(formData.nonOpsIncome);

    const gpMargin = revenue > 0 ? ((gp / revenue) * 100).toFixed(2) : "0.00";
    const totalOverheads = personal + admin + selling + financial + depreciation;
    const pbtBefore = (gp + otherIncome) - totalOverheads + provisions + exchange;
    const npMargin = revenue > 0 ? ((pbtBefore / revenue) * 100).toFixed(2) : "0.00";
    const pbtAfter = pbtBefore + nonOpsInc - nonOpsExp;
    // EBIT = PBT before financial expenses (pbtBefore already excludes financial expenses in totalOverheads, so add them back)
    const ebit = pbtBefore + financial;
    // EBITDA = EBIT before depreciation (add back depreciation)
    const ebitda = ebit + depreciation;

    return { gpMargin, totalOverheads: totalOverheads.toFixed(2), pbtBefore: pbtBefore.toFixed(2), npMargin, pbtAfter: pbtAfter.toFixed(2), ebit: ebit.toFixed(2), ebitda: ebitda.toFixed(2) };
  }, [formData]);

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
              <span className="mx-2">•</span>
              <span className="italic">Rejection: {editingRejectedReport.rejectionReason.substring(0, 80)}...</span>
            </div>
          </div>
        </div>
      )}

      
      {/* Header Banner - Actual Entry - Removed as per request */}
      

      
      {/* Selection Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Dropdown label="Cluster" value={cluster} options={clusters} onChange={setCluster} placeholder="Select Cluster" searchable />
          <Dropdown label="Company" value={company} options={companies.map(c => c.name)} onChange={setCompany} placeholder="Select Company" disabled={!cluster} searchable />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Financial Year</label>
            <div className="h-11 px-4 flex items-center text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600">
              {financialYear || "Auto-derived"}
            </div>
          </div>
          <Dropdown label="Reporting Month" value={month} options={MONTHS} onChange={setMonth} placeholder="Select Month" disabled={!company} />
        </div>
        {companyData && (
          <div className="mt-3 text-sm text-slate-500">Company Code: <span className="font-medium text-slate-800">{companyData.code}</span></div>
        )}
      </div>

      {/* Main Content - Full Width */}
      <div className="flex-1 flex overflow-hidden">
        {/* Form Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            <Section title="Actual Revenue & Income (LKR)">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
                <InputField label="Revenue" value={formData.revenue} onChange={v => update("revenue", v)} isCompleted={filled(formData.revenue)} />
                <InputField label="Gross Profit (GP)" value={formData.gp} onChange={v => update("gp", v)} isCompleted={filled(formData.gp)} />
                <CalcField label="GP Margin" value={calc.gpMargin} isCompleted={gpOk} suffix="%" />
                <InputField label="Other Income" value={formData.otherIncome} onChange={v => update("otherIncome", v)} isCompleted={filled(formData.otherIncome)} />
              </div>
            </Section>

            <Section title="Actual Operating Expenses (LKR)">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 pt-5">
                <InputField label="Personal Related" value={formData.personalExpenses} onChange={v => update("personalExpenses", v)} isCompleted={filled(formData.personalExpenses)} />
                <InputField label="Admin & Establishment" value={formData.adminExpenses} onChange={v => update("adminExpenses", v)} isCompleted={filled(formData.adminExpenses)} />
                <InputField label="Selling & Distribution" value={formData.sellingExpenses} onChange={v => update("sellingExpenses", v)} isCompleted={filled(formData.sellingExpenses)} />
                <InputField label="Financial Expenses" value={formData.financialExpenses} onChange={v => update("financialExpenses", v)} isCompleted={filled(formData.financialExpenses)} />
                <InputField label="Depreciation" value={formData.depreciation} onChange={v => update("depreciation", v)} isCompleted={filled(formData.depreciation)} />
                <CalcField label="Total Overheads" value={calc.totalOverheads} isCompleted={overheadsOk} />
              </div>
            </Section>

            <Section title="Actual Non-Operating Items (LKR)">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
                <InputField label="Provisions" value={formData.provisions} onChange={v => update("provisions", v)} isCompleted={filled(formData.provisions)} sign={formData.provisionsSign} onSignChange={s => update("provisionsSign", s)} showSign />
                <InputField label="Exchange (Loss/Gain)" value={formData.exchange} onChange={v => update("exchange", v)} isCompleted={filled(formData.exchange)} sign={formData.exchangeSign} onSignChange={s => update("exchangeSign", s)} showSign />
                <InputField label="Non-Operating Expenses" value={formData.nonOpsExpenses} onChange={v => update("nonOpsExpenses", v)} isCompleted={filled(formData.nonOpsExpenses)} />
                <InputField label="Non-Operating Income" value={formData.nonOpsIncome} onChange={v => update("nonOpsIncome", v)} isCompleted={filled(formData.nonOpsIncome)} />
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

        {/* Progress Panel - Light Green */}
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
            <button type="button" onClick={handleSaveDraft} className="h-10 px-5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors">
              Save Draft
            </button>
            <button type="button" onClick={() => setShowModal(true)} disabled={!pbtAfterOk || !company || !month}
              className="h-10 px-6 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Submit
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal isOpen={showModal} onClose={() => setShowModal(false)} onConfirm={() => { setShowModal(false); localStorage.removeItem("dataEntryDraft"); alert("Actual data submitted to Finance Director for review!"); }} company={company} month={month} />
    </div>
  );
}
