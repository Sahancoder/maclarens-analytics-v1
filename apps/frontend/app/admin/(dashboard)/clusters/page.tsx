"use client";

import { useState } from "react";
import { Plus, Layers, Building2, Edit, ToggleLeft, ToggleRight, ChevronRight } from "lucide-react";

interface Cluster {
  id: string;
  name: string;
  companies: number;
  activeCompanies: number;
  status: "active" | "inactive";
  createdAt: string;
}

const clustersData: Cluster[] = [
  { id: "1", name: "Liner", companies: 3, activeCompanies: 3, status: "active", createdAt: "Jan 2020" },
  { id: "2", name: "Shipping Services & Logistics", companies: 6, activeCompanies: 5, status: "active", createdAt: "Jan 2020" },
  { id: "3", name: "GAC Cluster", companies: 5, activeCompanies: 4, status: "active", createdAt: "Jan 2020" },
  { id: "4", name: "Warehouse & Logistics", companies: 2, activeCompanies: 2, status: "active", createdAt: "Mar 2021" },
  { id: "5", name: "Ship Supply Services", companies: 4, activeCompanies: 4, status: "active", createdAt: "Jan 2020" },
  { id: "6", name: "Lubricant I", companies: 2, activeCompanies: 2, status: "active", createdAt: "Jan 2020" },
  { id: "7", name: "Lubricant II", companies: 1, activeCompanies: 1, status: "active", createdAt: "Jun 2022" },
  { id: "8", name: "Manufacturing", companies: 3, activeCompanies: 3, status: "active", createdAt: "Jan 2020" },
  { id: "9", name: "Bunkering & Renewables", companies: 1, activeCompanies: 1, status: "active", createdAt: "Sep 2023" },
  { id: "10", name: "Property", companies: 3, activeCompanies: 3, status: "active", createdAt: "Jan 2020" },
  { id: "11", name: "Hotel & Leisure", companies: 1, activeCompanies: 1, status: "active", createdAt: "Jan 2020" },
  { id: "12", name: "Strategic Investment", companies: 1, activeCompanies: 1, status: "active", createdAt: "Jan 2020" },
];

export default function ClustersPage() {
  const [clusters, setClusters] = useState(clustersData);
  const [showAddModal, setShowAddModal] = useState(false);

  const toggleStatus = (id: string) => {
    setClusters((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === "active" ? "inactive" : "active" } : c
      )
    );
  };

  const totalCompanies = clusters.reduce((sum, c) => sum + c.companies, 0);
  const totalActive = clusters.reduce((sum, c) => sum + c.activeCompanies, 0);

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Cluster Management</h1>
            <p className="text-base text-slate-500 mt-2">Organize companies into clusters for reporting and analytics</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-11 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Cluster
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Layers className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Total Clusters</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{clusters.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Total Companies</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalCompanies}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Active Companies</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalActive}</p>
          </div>
        </div>

        {/* Clusters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {clusters.map((cluster) => (
            <div
              key={cluster.id}
              className={`bg-white rounded-xl border p-6 transition-all ${
                cluster.status === "active" ? "border-slate-200" : "border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Layers className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{cluster.name}</h3>
                    <p className="text-xs text-slate-500">Created {cluster.createdAt}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(cluster.id)}
                  className={`${cluster.status === "active" ? "text-emerald-500" : "text-slate-400"}`}
                >
                  {cluster.status === "active" ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{cluster.companies}</p>
                  <p className="text-xs text-slate-500">Companies</p>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{cluster.activeCompanies}</p>
                  <p className="text-xs text-slate-500">Active</p>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-400">{cluster.companies - cluster.activeCompanies}</p>
                  <p className="text-xs text-slate-500">Inactive</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 h-9 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1">
                  <Edit className="h-4 w-4" /> Edit
                </button>
                <button className="flex-1 h-9 text-sm font-medium text-[#0b1f3a] bg-[#0b1f3a]/10 rounded-lg hover:bg-[#0b1f3a]/20 transition-colors flex items-center justify-center gap-1">
                  View Companies <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Cluster Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">Add New Cluster</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cluster Name</label>
                <input type="text" className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg" placeholder="e.g., Renewables" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description (Optional)</label>
                <textarea className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg resize-none" rows={3} placeholder="Brief description of this cluster..." />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowAddModal(false)} className="h-10 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                Cancel
              </button>
              <button className="h-10 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90">
                Create Cluster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
