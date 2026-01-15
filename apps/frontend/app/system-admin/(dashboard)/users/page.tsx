"use client";

import { useState } from "react";
import { Search, Plus, MoreHorizontal, Mail, Building2, Shield, Edit, Trash2, UserCheck, UserX } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  cluster: string;
  status: "active" | "inactive";
  lastLogin: string;
}

const usersData: User[] = [
  { id: "1", name: "Sahan Hettiarachchi", email: "sahanhettiarachchi275@gmail.com", role: "Data Officer", company: "McLarens Maritime Academy", cluster: "Shipping Services", status: "active", lastLogin: "2 hours ago" },
  { id: "2", name: "Sahan Viranga", email: "sahanviranga18@gmail.com", role: "Finance Director", company: "McLarens Maritime Academy", cluster: "Shipping Services", status: "active", lastLogin: "1 day ago" },
  { id: "3", name: "Natali Craig", email: "natali.craig@mclarens.lk", role: "Data Officer", company: "GAC Shipping Limited", cluster: "GAC Cluster", status: "active", lastLogin: "3 hours ago" },
  { id: "4", name: "Drew Cano", email: "drew.cano@mclarens.lk", role: "Data Officer", company: "Spectra Logistics", cluster: "Warehouse & Logistics", status: "active", lastLogin: "5 hours ago" },
  { id: "5", name: "Orlando Diggs", email: "orlando.diggs@mclarens.lk", role: "Finance Director", company: "GAC Shipping Limited", cluster: "GAC Cluster", status: "active", lastLogin: "1 day ago" },
  { id: "6", name: "Andi Lane", email: "andi.lane@mclarens.lk", role: "Executive Viewer", company: "McLarens Group", cluster: "All Clusters", status: "active", lastLogin: "2 days ago" },
  { id: "7", name: "John Doe", email: "john.doe@mclarens.lk", role: "Data Officer", company: "Interocean Energy", cluster: "Bunkering", status: "inactive", lastLogin: "30 days ago" },
];

export default function UsersPage() {
  const [users, setUsers] = useState(usersData);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
                         user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
      )
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-base text-slate-500 mt-2">Manage user accounts, roles, and permissions</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-11 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add User
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
                placeholder="Search by name or email..."
                className="w-full h-11 pl-11 pr-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
            >
              <option value="all">All Roles</option>
              <option value="Data Officer">Data Officer</option>
              <option value="Finance Director">Finance Director</option>
              <option value="Executive Viewer">Executive Viewer</option>
              <option value="System Admin">System Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Cluster</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Last Login</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                          {user.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                        user.role === "Data Officer" ? "bg-blue-100 text-blue-700" :
                        user.role === "Finance Director" ? "bg-emerald-100 text-emerald-700" :
                        user.role === "Executive Viewer" ? "bg-purple-100 text-purple-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        <Shield className="h-3 w-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {user.company}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.cluster}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                        user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {user.status === "active" ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{user.lastLogin}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-[#0b1f3a] hover:bg-slate-100 rounded-lg transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(user.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.status === "active"
                              ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {user.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing {filteredUsers.length} of {users.length} users</p>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">Add New User</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                  <input type="text" className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                  <input type="text" className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input type="email" className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg" placeholder="user@mclarens.lk" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <select className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg">
                  <option>Select Role</option>
                  <option>Data Officer</option>
                  <option>Finance Director</option>
                  <option>Executive Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Assign to Company</label>
                <select className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg">
                  <option>Select Company</option>
                  <option>McLarens Maritime Academy</option>
                  <option>GAC Shipping Limited</option>
                  <option>Spectra Logistics</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowAddModal(false)} className="h-10 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                Cancel
              </button>
              <button className="h-10 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90">
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
