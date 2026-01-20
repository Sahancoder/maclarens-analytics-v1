"use client";

import { useState } from "react";
import { Shield, Check, X, Edit, Plus, Users, Eye, FileEdit, Trash2, Settings } from "lucide-react";

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  isSystem: boolean;
}

const allPermissions: Permission[] = [
  { id: "view_dashboard", name: "View Dashboard", description: "Access main dashboard" },
  { id: "view_reports", name: "View Reports", description: "View financial reports" },
  { id: "create_reports", name: "Create Reports", description: "Create and submit reports" },
  { id: "approve_reports", name: "Approve Reports", description: "Approve or reject reports" },
  { id: "view_analytics", name: "View Analytics", description: "Access analytics and charts" },
  { id: "export_data", name: "Export Data", description: "Export reports and data" },
  { id: "manage_users", name: "Manage Users", description: "Create, edit, delete users" },
  { id: "manage_companies", name: "Manage Companies", description: "Create, edit companies" },
  { id: "manage_clusters", name: "Manage Clusters", description: "Create, edit clusters" },
  { id: "manage_roles", name: "Manage Roles", description: "Create, edit roles" },
  { id: "view_audit", name: "View Audit Logs", description: "Access audit trail" },
  { id: "system_settings", name: "System Settings", description: "Modify system configuration" },
];

const rolesData: Role[] = [
  {
    id: "1",
    name: "System Administrator",
    description: "Full system access with all permissions",
    userCount: 2,
    permissions: allPermissions.map((p) => p.id),
    isSystem: true,
  },
  {
    id: "2",
    name: "Finance Director",
    description: "Manage company budgets and approve reports",
    userCount: 8,
    permissions: ["view_dashboard", "view_reports", "approve_reports", "view_analytics", "export_data"],
    isSystem: true,
  },
  {
    id: "3",
    name: "Data Officer",
    description: "Enter and submit actual financial data",
    userCount: 15,
    permissions: ["view_dashboard", "view_reports", "create_reports"],
    isSystem: true,
  },
  {
    id: "4",
    name: "Executive Viewer",
    description: "Read-only access to all reports and analytics",
    userCount: 5,
    permissions: ["view_dashboard", "view_reports", "view_analytics", "export_data"],
    isSystem: true,
  },
  {
    id: "5",
    name: "Cluster Head",
    description: "View and manage cluster-level data",
    userCount: 12,
    permissions: ["view_dashboard", "view_reports", "view_analytics", "export_data", "approve_reports"],
    isSystem: false,
  },
];

export default function RolesPage() {
  const [roles, setRoles] = useState(rolesData);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Roles & Permissions</h1>
            <p className="text-base text-slate-500 mt-2">Define roles and manage access permissions</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-11 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Role
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="xl:col-span-1 space-y-4">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">Available Roles</h2>
            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`bg-white rounded-xl border p-5 cursor-pointer transition-all ${
                  selectedRole?.id === role.id
                    ? "border-[#0b1f3a] ring-2 ring-[#0b1f3a]/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      role.name === "System Administrator" ? "bg-red-100 text-red-600" :
                      role.name === "Finance Director" ? "bg-emerald-100 text-emerald-600" :
                      role.name === "Data Officer" ? "bg-blue-100 text-blue-600" :
                      "bg-purple-100 text-purple-600"
                    }`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{role.name}</h3>
                      <p className="text-xs text-slate-500">{role.description}</p>
                    </div>
                  </div>
                  {role.isSystem && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">System</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>{role.userCount} users</span>
                  </div>
                  <span className="text-xs text-slate-400">{role.permissions.length} permissions</span>
                </div>
              </div>
            ))}
          </div>

          {/* Permissions Matrix */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedRole ? `${selectedRole.name} Permissions` : "Select a Role"}
                </h2>
                {selectedRole && !selectedRole.isSystem && (
                  <button className="flex items-center gap-1 text-sm text-[#0b1f3a] hover:underline">
                    <Edit className="h-4 w-4" /> Edit
                  </button>
                )}
              </div>
              
              {selectedRole ? (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allPermissions.map((perm) => {
                      const hasPermission = selectedRole.permissions.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                            hasPermission
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                              hasPermission ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
                            }`}>
                              {perm.id.includes("view") ? <Eye className="h-4 w-4" /> :
                               perm.id.includes("create") || perm.id.includes("manage") ? <FileEdit className="h-4 w-4" /> :
                               perm.id.includes("export") ? <Settings className="h-4 w-4" /> :
                               <Shield className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{perm.name}</p>
                              <p className="text-xs text-slate-500">{perm.description}</p>
                            </div>
                          </div>
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                            hasPermission ? "bg-emerald-500 text-white" : "bg-slate-300 text-white"
                          }`}>
                            {hasPermission ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Select a role to view its permissions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Role Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#0b1f3a]">Create New Role</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">Role Name</label>
                <input type="text" className="w-full h-10 px-3 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0b1f3a] focus:ring-1 focus:ring-[#0b1f3a]" placeholder="e.g., Regional Manager" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">Description</label>
                <textarea className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0b1f3a] focus:ring-1 focus:ring-[#0b1f3a] resize-none" rows={2} placeholder="Brief description of this role..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Permissions</label>
                <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  {allPermissions.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-3 p-1.5 hover:bg-white hover:shadow-sm rounded cursor-pointer transition-all">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#0b1f3a] focus:ring-[#0b1f3a]" />
                      <span className="text-sm text-slate-700">{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button className="h-9 px-4 text-sm font-medium text-white bg-[#0b1f3a] hover:bg-[#0b1f3a]/90 rounded-lg shadow-sm transition-colors">
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
