"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Trash2, Edit } from "lucide-react";

interface Draft {
  id: string;
  date: string;
  company: string;
  cluster: string;
  month: string;
  year: string;
  lastModified: number;
  completionPercent: number;
}

export default function ActualDraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    // Check if there's a draft in localStorage
    const draft = localStorage.getItem("actualDraft");
    if (draft) {
      const draftData = JSON.parse(draft);
      const { formData, company, cluster, month, year, lastModified } = draftData;
      
      const filledFields = Object.values(formData).filter(
        (v) => v !== "" && v !== "positive" && v !== "gain" && v !== "+" && v !== "-"
      ).length;
      // Approximate total fields in actual entry
      const totalFields = 16; 
      const completionPercent = Math.round((filledFields / totalFields) * 100);

      setDrafts([
        {
          id: "1",
          date: new Date(lastModified).toLocaleDateString(),
          company: company || "Unknown Company",
          cluster: cluster || "Unknown Cluster",
          month: month || "",
          year: year || "",
          lastModified: lastModified,
          completionPercent,
        },
      ]);
    }
  }, []);

  const handleResume = () => {
    router.push("/system-admin/actual-entry");
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this draft?")) {
      localStorage.removeItem("actualDraft");
      setDrafts([]);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-[#0b1f3a] mb-6">Actual Drafts</h1>

      {drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200"
            >
              <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#0b1f3a]">{draft.company}</h3>
                <p className="text-sm text-slate-500">
                  {draft.cluster} • {draft.month} {draft.year}
                </p>
                <p className="text-sm text-slate-500">
                  Last modified: {new Date(draft.lastModified).toLocaleString()} • {draft.completionPercent}% complete
                </p>
                <div className="mt-2 h-2 w-full max-w-xs bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
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
