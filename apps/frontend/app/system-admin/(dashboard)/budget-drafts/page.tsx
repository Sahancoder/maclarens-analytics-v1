"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Edit, Loader2 } from "lucide-react";
import { AdminAPI } from "@/lib/api-client";

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Backend metric keys that are user-input fields (not auto-calculated)
const INPUT_METRIC_KEYS = [
  "revenue", "gp", "other_income", "personal_exp", "admin_exp",
  "selling_exp", "finance_exp", "depreciation", "provisions",
  "exchange_variance", "non_ops_exp", "non_ops_income",
];

interface DraftData {
  company_id: string;
  company_name: string;
  cluster_name: string | null;
  period_id: number;
  year: number;
  month: number;
  status: string;
  budget_comment: string | null;
  submitted_by: string | null;
  submitted_date: string | null;
  metrics: Record<string, number | null>;
  completionPercent: number;
}

export default function BudgetDraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDrafts = async () => {
    setLoading(true);
    setError(null);

    const res = await AdminAPI.getBudgetDrafts();
    if (res.error || !res.data) {
      setError(res.error || "Failed to load drafts");
      setDrafts([]);
      setLoading(false);
      return;
    }

    const items: DraftData[] = res.data.drafts.map((d) => {
      const filledCount = INPUT_METRIC_KEYS.filter(
        (key) => d.metrics[key] !== null && d.metrics[key] !== undefined
      ).length;
      const completionPercent = Math.round((filledCount / INPUT_METRIC_KEYS.length) * 100);

      return { ...d, completionPercent };
    });

    setDrafts(items);
    setLoading(false);
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleResume = (draft: DraftData) => {
    // Store draft info so budget-entry page can load it
    const resumeData = {
      company_id: draft.company_id,
      year: draft.year,
      month: draft.month,
    };
    sessionStorage.setItem("budgetDraftResume", JSON.stringify(resumeData));
    router.push("/system-admin/budget-entry");
  };

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-[#0b1f3a] mb-6">Budget Drafts</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
        </div>
      ) : drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={`${draft.company_id}-${draft.period_id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200"
            >
              <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#0b1f3a]">{draft.company_name}</h3>
                <p className="text-sm text-slate-500">
                  {draft.cluster_name && <span>{draft.cluster_name} &bull; </span>}
                  {MONTHS[draft.month]} {draft.year} &bull; {draft.completionPercent}% complete
                  {draft.submitted_date && (
                    <span> &bull; Last saved: {new Date(draft.submitted_date).toLocaleString()}</span>
                  )}
                </p>
                <div className="mt-2 h-2 w-full max-w-xs bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${draft.completionPercent}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResume(draft)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0b1f3a] text-white rounded-lg text-sm font-medium hover:bg-[#0b1f3a]/90 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Resume
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No drafts found</h3>
          <p className="text-slate-500">
            Budget drafts saved via Budget Entry will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
