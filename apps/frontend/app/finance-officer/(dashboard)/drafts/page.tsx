"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Edit, RefreshCw, Calendar, Building2, Trash2 } from "lucide-react";
import { FOAPI } from "@/lib/api-client";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DraftItem {
  company_id: string;
  company_name: string;
  cluster_name: string;
  period_id: number;
  year: number;
  month: number;
  status: string;
  actual_comment: string | null;
  submitted_by: string | null;
  submitted_date: string | null;
  metrics: Record<string, number | null>;
}

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDrafts = async () => {
    setLoading(true);
    setError(null);
    const res = await FOAPI.getActualDrafts();
    setLoading(false);
    if (res.data) {
      setDrafts(res.data.drafts);
    } else {
      setError(res.error || "Failed to load drafts");
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleDelete = async (draft: DraftItem) => {
    if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
      return;
    }
    
    // Construct report ID as expected by backend (company_id_period_id)
    const reportId = `${draft.company_id}_${draft.period_id}`;
    
    try {
      const res = await FOAPI.deleteDraft(reportId);
      if (res.status === 200 || res.data?.success) {
        // Refresh drafts list
        loadDrafts();
      } else {
        alert(res.error || "Failed to delete draft");
      }
    } catch (err) {
      console.error("Delete failed", err);
      alert("An error occurred while deleting the draft");
    }
  };

  const handleResume = (draft: DraftItem) => {
    sessionStorage.setItem(
      "editingRejectedReport",
      JSON.stringify({
        reportId: `${draft.company_id}-${draft.year}-${draft.month}`,
        companyName: draft.company_name,
        cluster: draft.cluster_name,
        period: `${MONTHS[draft.month]} ${draft.year}`,
        formData: {
          revenue: String(draft.metrics.revenue ?? ""),
          gp: String(draft.metrics.gp ?? ""),
          otherIncome: String(draft.metrics.other_income ?? ""),
          personalExpenses: String(draft.metrics.personal_exp ?? ""),
          adminExpenses: String(draft.metrics.admin_exp ?? ""),
          sellingExpenses: String(draft.metrics.selling_exp ?? ""),
          financialExpenses: String(draft.metrics.finance_exp ?? ""),
          depreciation: String(draft.metrics.depreciation ?? ""),
          provisions: String(draft.metrics.provisions ?? ""),
          exchange: String(draft.metrics.exchange_variance ?? ""),
          nonOpsExpenses: String(draft.metrics.non_ops_exp ?? ""),
          nonOpsIncome: String(draft.metrics.non_ops_income ?? ""),
        },
      })
    );
    router.push("/finance-officer/dashboard");
  };

  const getCompletionPercent = (metrics: Record<string, number | null>): number => {
    const inputFields = [
      "revenue", "gp", "other_income", "personal_exp", "admin_exp",
      "selling_exp", "finance_exp", "depreciation", "provisions",
      "exchange_variance", "non_ops_exp", "non_ops_income",
    ];
    const filled = inputFields.filter((f) => metrics[f] != null && metrics[f] !== 0).length;
    return Math.round((filled / inputFields.length) * 100);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0b1f3a] mb-6">Actual Drafts</h1>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-[#0b1f3a] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0b1f3a]">Actual Drafts</h1>
        <button
          onClick={loadDrafts}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#0b1f3a] hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => {
            const pct = getCompletionPercent(draft.metrics);
            return (
              <div
                key={`${draft.company_id}-${draft.period_id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#0b1f3a]">{draft.company_name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {draft.cluster_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {MONTHS[draft.month]} {draft.year}
                    </span>
                    {draft.submitted_date && (
                      <span>Saved: {new Date(draft.submitted_date).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 w-full max-w-xs bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500">{pct}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(draft)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Draft"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleResume(draft)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0b1f3a] text-white rounded-lg text-sm font-medium hover:bg-[#0b1f3a]/90 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Resume
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No drafts</h3>
          <p className="text-slate-500">
            Your saved actual entry drafts will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
