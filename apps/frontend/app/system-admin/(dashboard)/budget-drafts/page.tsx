"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Edit } from "lucide-react";

interface Draft {
  id: string;
  date: string;
  company: string;
  lastModified: number;
  completionPercent: number;
}

export default function BudgetDraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    // Check if there's a draft in localStorage
    const draft = localStorage.getItem("budgetDraft");
    if (draft) {
      const draftData = JSON.parse(draft);
      const { formData, company, lastModified } = draftData;
      
      const filledFields = Object.values(formData).filter(
        (v) => v !== "" && v !== "positive" && v !== "gain" && v !== "+" && v !== "-"
      ).length;
      // Approximate total fields in budget entry
      const totalFields = 16; 
      const completionPercent = Math.round((filledFields / totalFields) * 100);

      setDrafts([
        {
          id: "1",
          date: new Date(lastModified).toLocaleDateString(),
          company: company || "Unknown Company",
          lastModified: lastModified,
          completionPercent,
        },
      ]);
    }
  }, []);

  const handleResume = () => {
    router.push("/system-admin/budget-entry");
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this draft?")) {
      localStorage.removeItem("budgetDraft");
      setDrafts([]);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-[#0b1f3a] mb-6">Budget Drafts</h1>

      {drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200"
            >
              <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#0b1f3a]">{draft.company}</h3>
                <p className="text-sm text-slate-500">
                  Last modified: {new Date(draft.lastModified).toLocaleString()} • {draft.completionPercent}% complete
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
                  onClick={handleResume}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0b1f3a] text-white rounded-lg text-sm font-medium hover:bg-[#0b1f3a]/90 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Resume
                </button>
                <button
                  onClick={() => handleDelete(draft.id)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
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
            Incomplete budget entries you save will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
