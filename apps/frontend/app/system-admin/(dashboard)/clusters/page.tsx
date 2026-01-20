"use client";

import { useState } from "react";
import { Plus, Layers, Building2, Edit, ToggleLeft, ToggleRight, ChevronRight, X, Trash2, ChevronDown } from "lucide-react";

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
  const [allCompanies, setAllCompanies] = useState([
    { id: "1", name: "McLarens Maritime Academy", cluster: "Shipping Services & Logistics" },
    { id: "2", name: "GAC Shipping Limited", cluster: "GAC Cluster" },
    { id: "3", name: "Spectra Integrated Logistics", cluster: "Warehouse & Logistics" },
    { id: "4", name: "Interocean Energy", cluster: "Bunkering & Renewables" },
    { id: "5", name: "ONE", cluster: "Liner" },
    { id: "6", name: "MSC", cluster: "Liner" },
    { id: "7", name: "GAC Marine Services", cluster: "GAC Cluster" },
    { id: "8", name: "McOcean", cluster: "Ship Supply Services" },
    { id: "9", name: "McShaw", cluster: "Lubricant I" }, 
    { id: "10", name: "Alliance Agencies", cluster: "Shipping Services & Logistics" }
  ]);

  const [clusters, setClusters] = useState(clustersData);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [viewingCluster, setViewingCluster] = useState<Cluster | null>(null);

  // Add Company Modal State
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: "",
    cluster: "",
    fyStartMonth: "April"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Helpers */
  const getClusterCompanies = (clusterName: string) => {
    return allCompanies.filter(c => c.cluster === clusterName);
  };

  const toggleStatus = (id: string) => {
    setClusters((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === "active" ? "inactive" : "active" } : c
      )
    );
  };
  
  const totalCompanies = clusters.reduce((sum, c) => sum + c.companies, 0);
  const totalActive = clusters.reduce((sum, c) => sum + c.activeCompanies, 0);

  // Handlers for Add Company
  const handleAddCompanyClick = () => {
    if (!viewingCluster) return;
    setNewCompanyData({
      name: "",
      cluster: viewingCluster.name,
      fyStartMonth: "April"
    });
    setShowAddCompanyModal(true);
  };

  const handleCreateCompany = async () => {
    // Validation
    if (!newCompanyData.name.trim()) {
      alert("Company name is required");
      return;
    }
    
    // Check for duplicate name
    if (allCompanies.some(c => c.name.toLowerCase() === newCompanyData.name.trim().toLowerCase())) {
      alert("A company with this name already exists");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    const newCompany = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCompanyData.name.trim(),
      cluster: newCompanyData.cluster
    };

    setAllCompanies([...allCompanies, newCompany]);

    // Update cluster counts
    setClusters(prev => prev.map(c => 
      c.name === newCompanyData.cluster 
        ? { ...c, companies: c.companies + 1, activeCompanies: c.activeCompanies + 1 } 
        : c
    ));
    
    setIsSubmitting(false);
    setShowAddCompanyModal(false);
  };

  const months = ["January", "April"];

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
                <button 
                  onClick={() => setEditingCluster(cluster)}
                  className="flex-1 h-9 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Edit className="h-4 w-4" /> Edit
                </button>
                <button 
                  onClick={() => setViewingCluster(cluster)}
                  className="flex-1 h-9 text-sm font-medium text-[#0b1f3a] bg-[#0b1f3a]/10 rounded-lg hover:bg-[#0b1f3a]/20 transition-colors flex items-center justify-center gap-1"
                >
                  View Companies <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Cluster Modal */}
      {editingCluster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#0b1f3a]">Edit Cluster</h3>
              <button onClick={() => setEditingCluster(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">Cluster Name</label>
                <input 
                  type="text" 
                  defaultValue={editingCluster.name}
                  className="w-full h-10 px-3 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0b1f3a] focus:ring-1 focus:ring-[#0b1f3a]" 
                />
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-2">
              <button 
                onClick={() => {
                  alert("Cluster deleted!");
                  setEditingCluster(null);
                }}
                className="h-9 px-4 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Delete Cluster
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditingCluster(null)} className="h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button className="h-9 px-4 text-sm font-medium text-white bg-[#0b1f3a] hover:bg-[#0b1f3a]/90 rounded-lg shadow-sm transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Companies Modal */}
      {viewingCluster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#0b1f3a]">Companies in {viewingCluster.name}</h3>
              <button onClick={() => setViewingCluster(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-semibold text-slate-700 uppercase">Assigned Companies</h4>
                <button 
                  onClick={handleAddCompanyClick}
                  className="text-xs font-medium text-[#0b1f3a] hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Company
                </button>
              </div>
              
              <div className="space-y-2">
                {getClusterCompanies(viewingCluster.name).length > 0 ? (
                  getClusterCompanies(viewingCluster.name).map((company) => (
                    <div key={company.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-slate-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{company.name}</span>
                      </div>
                      <button className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors">
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <p className="text-sm text-slate-500">No companies assigned to this cluster</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setViewingCluster(null)} className="h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal (Stacked) */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#0b1f3a]">Add New Company</h3>
              <button 
                onClick={() => setShowAddCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">Company Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={newCompanyData.name}
                  onChange={(e) => setNewCompanyData({...newCompanyData, name: e.target.value})}
                  placeholder="e.g. Acme Logistics"
                  className="w-full h-10 px-3 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0b1f3a] focus:ring-1 focus:ring-[#0b1f3a]"
                  disabled={isSubmitting}
                />
              </div>

              {/* Cluster (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">Cluster <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={newCompanyData.cluster}
                  readOnly
                  className="w-full h-10 px-3 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg cursor-not-allowed"
                />
              </div>

              {/* FY Start Month */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">Financial Year Start Month <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select 
                    value={newCompanyData.fyStartMonth}
                    onChange={(e) => setNewCompanyData({...newCompanyData, fyStartMonth: e.target.value})}
                    className="w-full h-10 px-3 pr-8 text-sm text-slate-900 border border-slate-200 rounded-lg appearance-none bg-white focus:outline-none focus:border-[#0b1f3a] focus:ring-1 focus:ring-[#0b1f3a]"
                    disabled={isSubmitting}
                  >
                    {months.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">YTD values are calculated based on the financial year start month.</p>
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => setShowAddCompanyModal(false)}
                className="h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateCompany}
                disabled={isSubmitting}
                className="h-9 px-4 text-sm font-medium text-white bg-[#0b1f3a] hover:bg-[#0b1f3a]/90 rounded-lg shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Company"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Cluster Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#0b1f3a]">Add New Cluster</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">Cluster Name</label>
                <input type="text" className="w-full h-10 px-3 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0b1f3a] focus:ring-1 focus:ring-[#0b1f3a]" placeholder="e.g., Renewables" />
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button className="h-9 px-4 text-sm font-medium text-white bg-[#0b1f3a] hover:bg-[#0b1f3a]/90 rounded-lg shadow-sm transition-colors">
                Create Cluster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
