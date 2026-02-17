"use client";

import { useEffect, useState } from "react";
import { Edit, Layers, Plus, ToggleLeft, ToggleRight, X } from "lucide-react";
import { AdminAPI, type AdminCluster, type AdminCompany } from "@/lib/api-client";

export default function ClustersPage() {
  const [clusters, setClusters] = useState<AdminCluster[]>([]);
  const [summary, setSummary] = useState({
    total_clusters: 0,
    total_companies: 0,
    active_companies: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AdminCluster | null>(null);
  const [viewing, setViewing] = useState<AdminCluster | null>(null);
  const [clusterCompanies, setClusterCompanies] = useState<AdminCompany[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [newClusterName, setNewClusterName] = useState("");
  const [editClusterName, setEditClusterName] = useState("");

  const loadClusters = async () => {
    setLoading(true);
    setError(null);
    const response = await AdminAPI.getClustersList();
    if (response.error || !response.data) {
      setError(response.error || "Failed to load clusters");
      setClusters([]);
      setLoading(false);
      return;
    }

    setClusters(response.data.clusters);
    setSummary({
      total_clusters: response.data.total_clusters,
      total_companies: response.data.total_companies,
      active_companies: response.data.active_companies,
    });
    setLoading(false);
  };

  useEffect(() => {
    loadClusters();
  }, []);

  const openEdit = (cluster: AdminCluster) => {
    setEditing(cluster);
    setEditClusterName(cluster.cluster_name);
  };

  const openView = async (cluster: AdminCluster) => {
    setViewing(cluster);
    const response = await AdminAPI.getClusterCompanies(cluster.cluster_id);
    setClusterCompanies(response.data || []);
  };

  const createCluster = async () => {
    if (!newClusterName.trim()) {
      setError("Cluster name is required.");
      return;
    }

    setSubmitting(true);
    const response = await AdminAPI.createCluster({
      cluster_name: newClusterName.trim(),
      is_active: true,
    });
    setSubmitting(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    setShowAdd(false);
    setNewClusterName("");
    await loadClusters();
  };

  const saveClusterEdit = async () => {
    if (!editing) return;
    if (!editClusterName.trim()) {
      setError("Cluster name is required.");
      return;
    }

    setSubmitting(true);
    const response = await AdminAPI.updateCluster(editing.cluster_id, {
      cluster_name: editClusterName.trim(),
    });
    setSubmitting(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    setEditing(null);
    await loadClusters();
  };

  const toggleClusterStatus = async (cluster: AdminCluster) => {
    const response = await AdminAPI.updateCluster(cluster.cluster_id, {
      is_active: !cluster.is_active,
    });
    if (response.error) {
      setError(response.error);
      return;
    }
    await loadClusters();
  };

  const deactivateCluster = async (cluster: AdminCluster) => {
    const response = await AdminAPI.deleteCluster(cluster.cluster_id);
    if (response.error) {
      setError(response.error);
      return;
    }
    setEditing(null);
    await loadClusters();
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Cluster Management</h1>
            <p className="text-slate-500 mt-1">Live cluster and company aggregation</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="h-10 px-4 rounded-lg bg-[#0b1f3a] text-white text-sm font-medium inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Cluster
          </button>
        </div>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard title="Total Clusters" value={summary.total_clusters} />
          <SummaryCard title="Total Companies" value={summary.total_companies} />
          <SummaryCard title="Active Companies" value={summary.active_companies} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading && <p className="text-sm text-slate-500">Loading clusters...</p>}
          {!loading && clusters.length === 0 && <p className="text-sm text-slate-500">No clusters found.</p>}
          {!loading && clusters.map((cluster) => (
            <div key={cluster.cluster_id} className={`rounded-xl border p-4 bg-white ${cluster.is_active ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{cluster.cluster_name}</h3>
                    <p className="text-xs text-slate-500">{cluster.cluster_id}</p>
                  </div>
                </div>
                <button onClick={() => toggleClusterStatus(cluster)} className={cluster.is_active ? "text-emerald-500" : "text-slate-400"}>
                  {cluster.is_active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Metric label="Companies" value={cluster.total_companies} />
                <Metric label="Active" value={cluster.active_companies} />
                <Metric label="Inactive" value={cluster.inactive_companies} />
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(cluster)} className="flex-1 h-9 rounded-lg border border-slate-300 text-sm inline-flex items-center justify-center gap-1">
                  <Edit className="h-4 w-4" /> Edit
                </button>
                <button onClick={() => openView(cluster)} className="flex-1 h-9 rounded-lg bg-slate-100 text-sm">
                  View Companies
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Cluster" onClose={() => setShowAdd(false)}>
          <input
            value={newClusterName}
            onChange={(e) => setNewClusterName(e.target.value)}
            placeholder="Cluster name"
            className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
          />
          <ModalActions
            onCancel={() => setShowAdd(false)}
            onSubmit={createCluster}
            submitLabel={submitting ? "Creating..." : "Create Cluster"}
            disabled={submitting}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Cluster" onClose={() => setEditing(null)}>
          <input
            value={editClusterName}
            onChange={(e) => setEditClusterName(e.target.value)}
            placeholder="Cluster name"
            className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
          />
          <div className="flex justify-between gap-2">
            <button
              onClick={() => deactivateCluster(editing)}
              className="h-9 px-3 rounded-lg border border-rose-300 text-rose-700 text-sm"
            >
              Deactivate
            </button>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="h-9 px-3 rounded-lg border border-slate-300 text-sm">
                Cancel
              </button>
              <button
                onClick={saveClusterEdit}
                disabled={submitting}
                className="h-9 px-3 rounded-lg bg-[#0b1f3a] text-white text-sm disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal title={`Companies - ${viewing.cluster_name}`} onClose={() => setViewing(null)}>
          <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
            {clusterCompanies.length === 0 && <p className="text-sm text-slate-500 p-3">No companies found.</p>}
            {clusterCompanies.map((company) => (
              <div key={company.company_id} className="px-3 py-2 border-b border-slate-100 last:border-0">
                <p className="text-sm text-slate-900">{company.company_name}</p>
                <p className="text-xs text-slate-500">{company.company_id}</p>
              </div>
            ))}
          </div>
          <ModalActions onCancel={() => setViewing(null)} onSubmit={() => setViewing(null)} submitLabel="Close" />
        </Modal>
      )}
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase text-slate-500">{title}</p>
      <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-500"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onSubmit,
  submitLabel,
  disabled,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
      <button onClick={onCancel} className="h-9 px-3 text-sm border border-slate-300 rounded-lg">
        Cancel
      </button>
      <button onClick={onSubmit} disabled={disabled} className="h-9 px-3 text-sm rounded-lg bg-[#0b1f3a] text-white disabled:opacity-60">
        {submitLabel}
      </button>
    </div>
  );
}
