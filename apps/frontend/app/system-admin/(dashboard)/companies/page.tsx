"use client";

import { useState } from "react";
import { Search, Plus, Building2, Edit, ToggleLeft, ToggleRight, Users, Calendar } from "lucide-react";

interface Company {
  id: string;
  code: string;
  name: string;
  cluster: string;
  yearEnd: string;
  director: string;
  dataOfficer: string;
  status: "active" | "inactive";
}

const companiesData: Company[] = [
  { id: "1", code: "MMA", name: "McLarens Maritime Academy", cluster: "Shipping Services & Logistics", yearEnd: "March", director: "Sahan Viranga", dataOfficer: "Sahan Hettiarachchi", status: "active" },
  { id: "2", code: "GSL", name: "GAC Shipping Limited", cluster: "GAC Cluster", yearEnd: "December", director: "Orlando Diggs", dataOfficer: "Natali Craig", status: "active" },
  { id: "3", code: "SPIL", name: "Spectra Integrated Logistics", cluster: "Warehouse & Logistics", yearEnd: "March", director: "—", dataOfficer: "Drew Cano", status: "active" },
  { id: "4", code: "IOE", name: "Interocean Energy", cluster: "Bunkering & Renewables", yearEnd: "March", director: "—", dataOfficer: "—", status: "active" },
  { id: "5", code: "ONE", name: "ONE", cluster: "Liner", yearEnd: "March", director: "—", dataOfficer: "—", status: "active" },
  { id: "6", code: "MSC", name: "MSC", cluster: "Liner", yearEnd: "December", director: "—", dataOfficer: "—", status: "active" },
  { id: "7", code: "GMSL", name: "GAC Marine Services", cluster: "GAC Cluster", yearEnd: "December", director: "—", dataOfficer: "—", status: "inactive" },
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState(companiesData);
  const [search, setSearch] = useState("");
  const [clusterFilter, setClusterFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [assigningCompany, setAssigningCompany] = useState<Company | null>(null);

  const clusters = Array.from(new Set(companiesData.map((c) => c.cluster)));

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase()) ||
                         company.code.toLowerCase().includes(search.toLowerCase());
    const matchesCluster = clusterFilter === "all" || company.cluster === clusterFilter;
    return matchesSearch && matchesCluster;
  });

  const toggleStatus = (id: string) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === "active" ? "inactive" : "active" } : c
      )
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Company Management</h1>
            <p className="text-base text-slate-500 mt-2">Manage companies, assign clusters, and configure settings</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-11 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Company
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or code..."
                className="w-full h-11 pl-11 pr-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
              />
            </div>
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
            >
              <option value="all">All Clusters</option>
              {clusters.map((cluster) => (
                <option key={cluster} value={cluster}>{cluster}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className={`bg-white rounded-xl border p-6 transition-all ${
                company.status === "active" ? "border-slate-200" : "border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-[#0b1f3a]/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-[#0b1f3a]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{company.name}</h3>
                    <p className="text-sm text-slate-500">{company.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(company.id)}
                  className={`${company.status === "active" ? "text-emerald-500" : "text-slate-400"}`}
                >
                  {company.status === "active" ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 w-20">Cluster:</span>
                  <span className="text-slate-700 font-medium">{company.cluster}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">Year End: {company.yearEnd}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Director:</span>
                  <span className={company.director === "—" ? "text-slate-400" : "text-slate-700 font-medium"}>
                    {company.director}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Data Officer:</span>
                  <span className={company.dataOfficer === "—" ? "text-slate-400" : "text-slate-700 font-medium"}>
                    {company.dataOfficer}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setEditingCompany(company)}
                  className="flex-1 h-9 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => setAssigningCompany(company)}
                  className="flex-1 h-9 text-sm font-medium text-[#0b1f3a] bg-[#0b1f3a]/10 rounded-lg hover:bg-[#0b1f3a]/20 transition-colors"
                >
                  Assign Users
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">Edit Company</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Code</label>
                  <input 
                    type="text" 
                    defaultValue={editingCompany.code}
                    className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg bg-slate-50" 
                    readOnly
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                  <input 
                    type="text" 
                    defaultValue={editingCompany.name}
                    className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cluster</label>
                <select 
                  defaultValue={editingCompany.cluster}
                  className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg"
                >
                  {clusters.map((cluster) => (
                    <option key={cluster}>{cluster}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Financial Year End</label>
                <select 
                  defaultValue={editingCompany.yearEnd}
                  className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg"
                >
                  <option>March</option>
                  <option>December</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button 
                onClick={() => setEditingCompany(null)} 
                className="h-10 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert("Company updated successfully!");
                  setEditingCompany(null);
                }}
                className="h-10 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {assigningCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Assign Users</h3>
            <p className="text-sm text-slate-500 mb-6">Assign key personnel for <span className="font-semibold text-slate-800">{assigningCompany.name}</span></p>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Finance Director</label>
                <div className="relative">
                  <select 
                    defaultValue={assigningCompany.director === "—" ? "" : assigningCompany.director}
                    className="w-full h-11 pl-4 pr-10 text-sm border border-slate-300 rounded-lg appearance-none"
                  >
                    <option value="">Select Director...</option>
                    <option value="Sahan Viranga">Sahan Viranga</option>
                    <option value="Orlando Diggs">Orlando Diggs</option>
                    <option value="Sarah Smith">Sarah Smith</option>
                  </select>
                  <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Data Officer</label>
                <div className="relative">
                  <select 
                    defaultValue={assigningCompany.dataOfficer === "—" ? "" : assigningCompany.dataOfficer}
                    className="w-full h-11 pl-4 pr-10 text-sm border border-slate-300 rounded-lg appearance-none"
                  >
                    <option value="">Select Officer...</option>
                    <option value="Sahan Hettiarachchi">Sahan Hettiarachchi</option>
                    <option value="Natali Craig">Natali Craig</option>
                    <option value="Drew Cano">Drew Cano</option>
                    <option value="John Doe">John Doe</option>
                  </select>
                  <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button 
                onClick={() => setAssigningCompany(null)} 
                className="h-10 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert("Users assigned successfully!");
                  setAssigningCompany(null);
                }}
                className="h-10 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
