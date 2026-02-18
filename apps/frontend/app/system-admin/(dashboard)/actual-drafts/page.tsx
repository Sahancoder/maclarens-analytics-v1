"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Trash2, Edit, RefreshCw, User, Calendar } from "lucide-react";
import { AdminAPI } from "@/lib/api-client";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface Draft {
  company_id: string;
  company_name: string;
  cluster_name: string | null;
  period_id: number;
  year: number;
  month: number;
  status: string;
  actual_comment: string | null;
  submitted_by: string | null;
  submitted_date: string | null;
  metrics: Record<string, number | null>;
  completionPercent: number;
}

export default function ActualDraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDrafts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await AdminAPI.getActualDrafts();
      if (response.error) {
        setError(response.error);
        setDrafts([]);
      } else if (response.data) {
        // Calculate completion percentage for each draft
        const draftsWithCompletion = response.data.drafts.map((draft) => {
          const metrics = draft.metrics || {};
          const totalFields = 12; // Number of input fields in actual entry form
          const filledFields = Object.values(metrics).filter(
            (v) => v !== null && v !== undefined
          ).length;
          const completionPercent = Math.round((filledFields / totalFields) * 100);
          return {
            ...draft,
            actual_comment: draft.budget_comment, // API returns budget_comment for both
            completionPercent,
          };
        });
        setDrafts(draftsWithCompletion);
      }
    } catch (err) {
      setError("Failed to load drafts");
      setDrafts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleResume = (draft: Draft) => {
    // Store draft info in sessionStorage to resume in actual-entry page
    sessionStorage.setItem("actualDraftResume", JSON.stringify({
      company_id: draft.company_id,
      year: draft.year,
      month: draft.month,
    }));
    router.push("/system-admin/actual-entry");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0b1f3a]">Actual Drafts</h1>
        <button
          onClick={loadDrafts}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
          <RefreshCw className="h-8 w-8 text-slate-400 mx-auto mb-4 animate-spin" />
          <p className="text-slate-500">Loading drafts...</p>
        </div>
      ) : drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={`${draft.company_id}-${draft.period_id}`}
              className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="h-14 w-14 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="h-7 w-7 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#0b1f3a] text-lg">{draft.company_name}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {draft.cluster_name || "Unknown Cluster"} • {MONTHS[draft.month - 1]} {draft.year}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  {draft.submitted_by && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {draft.submitted_by}
                    </span>
                  )}
                  {draft.submitted_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(draft.submitted_date)}
                    </span>
                  )}
                </div>
                {draft.actual_comment && (
                  <p className="text-xs text-slate-400 mt-2 truncate max-w-md">
                    Comment: {draft.actual_comment}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 w-full max-w-xs bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${draft.completionPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{draft.completionPercent}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleResume(draft)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0b1f3a] text-white rounded-lg text-sm font-medium hover:bg-[#0b1f3a]/90 transition-colors"
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
          <FileSpreadsheet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No drafts found</h3>
          <p className="text-slate-500">
            Incomplete actual entries you save will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
