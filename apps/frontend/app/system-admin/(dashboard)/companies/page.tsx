"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, ToggleLeft, ToggleRight, X } from "lucide-react";
import {
  AdminAPI,
  type AdminAssignment,
  type AdminCompany,
  type AdminRole,
  type AdminUser,
  type AdminCluster,
} from "@/lib/api-client";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [clusters, setClusters] = useState<AdminCluster[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AdminCompany | null>(null);
  const [assigning, setAssigning] = useState<AdminCompany | null>(null);
  const [companyAssignments, setCompanyAssignments] = useState<AdminAssignment[]>([]);

  const [newCompany, setNewCompany] = useState({
    company_name: "",
    cluster_id: "",
    fin_year_start_month: "1",
  });
  const [editCompany, setEditCompany] = useState({
    company_name: "",
    cluster_id: "",
    fin_year_start_month: "1",
  });
  const [newAssignment, setNewAssignment] = useState({
    user_id: "",
    role_id: "",
  });
  const [pendingAssignments, setPendingAssignments] = useState<
    { user_id: string; user_name: string; user_email: string; role_id: number; role_name: string }[]
  >([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadLookups = async () => {
    const [clustersRes, usersRes, rolesRes] = await Promise.all([
      AdminAPI.getClustersList(),
      AdminAPI.getUsers({ page: 1, page_size: 1000, is_active: true }),
      AdminAPI.getRoles(),
    ]);

    if (clustersRes.data) setClusters(clustersRes.data.clusters);
    if (usersRes.data) setUsers(usersRes.data.users);
    if (rolesRes.data) setRoles(rolesRes.data);
  };

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);

    const response = await AdminAPI.getCompaniesList({
      page: 1,
      page_size: 200,
      search: search || undefined,
      cluster_id: clusterFilter || undefined,
    });

    if (response.error || !response.data) {
      setError(response.error || "Failed to load companies");
      setCompanies([]);
      setLoading(false);
      return;
    }

    setCompanies(response.data.companies);
    setLoading(false);
  };

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter users based on search text
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter((u) => {
      const name = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
      return name.includes(q) || u.user_email.toLowerCase().includes(q);
    });
  }, [users, userSearch]);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [search, clusterFilter]);

  const openEdit = (company: AdminCompany) => {
    setEditing(company);
    setEditCompany({
      company_name: company.company_name,
      cluster_id: company.cluster_id,
      fin_year_start_month: String(company.fin_year_start_month || 1),
    });
  };

  const openAssign = async (company: AdminCompany) => {
    setAssigning(company);
    setNewAssignment({ user_id: "", role_id: "" });
    setPendingAssignments([]);
    setUserSearch("");
    setShowUserDropdown(false);
    setError(null);
    const response = await AdminAPI.getCompanyUsers(company.company_id);
    setCompanyAssignments(response.data || []);
  };

  const createCompany = async () => {
    if (!newCompany.company_name || !newCompany.cluster_id) {
      setError("Company name and cluster are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await AdminAPI.createCompany({
      company_name: newCompany.company_name.trim(),
      cluster_id: newCompany.cluster_id,
      fin_year_start_month: Number(newCompany.fin_year_start_month),
      is_active: true,
    });
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setShowAdd(false);
    setNewCompany({ company_name: "", cluster_id: "", fin_year_start_month: "1" });
    await loadCompanies();
    await loadLookups();
  };

  const updateCompany = async () => {
    if (!editing) return;

    setSubmitting(true);
    const res = await AdminAPI.updateCompany(editing.company_id, {
      company_name: editCompany.company_name.trim(),
      cluster_id: editCompany.cluster_id,
      fin_year_start_month: Number(editCompany.fin_year_start_month),
    });
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setEditing(null);
    await loadCompanies();
    await loadLookups();
  };

  const toggleCompanyStatus = async (company: AdminCompany) => {
    const res = await AdminAPI.updateCompany(company.company_id, { is_active: !company.is_active });
    if (res.error) {
      setError(res.error);
      return;
    }
    await loadCompanies();
    await loadLookups();
  };

  const addAssignment = () => {
    if (!assigning || !newAssignment.user_id || !newAssignment.role_id) return;

    const roleId = Number(newAssignment.role_id);
    const alreadyExists =
      companyAssignments.some((a) => a.user_id === newAssignment.user_id && a.role_id === roleId) ||
      pendingAssignments.some((a) => a.user_id === newAssignment.user_id && a.role_id === roleId);

    if (alreadyExists) {
      setError("This user-role assignment already exists.");
      return;
    }

    const user = users.find((u) => u.user_id === newAssignment.user_id);
    const role = roles.find((r) => r.role_id === roleId);
    if (!user || !role) return;

    const displayName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.user_email;

    setPendingAssignments((prev) => [
      ...prev,
      {
        user_id: user.user_id,
        user_name: displayName,
        user_email: user.user_email,
        role_id: role.role_id,
        role_name: role.role_name,
      },
    ]);
    setNewAssignment({ user_id: "", role_id: "" });
    setUserSearch("");
    setError(null);
  };

  const removePending = (index: number) => {
    setPendingAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAssignment = async (assignment: AdminAssignment) => {
    if (!assigning) return;

    const res = await AdminAPI.deleteAssignment(
      assignment.user_id,
      assigning.company_id,
      assignment.role_id
    );
    if (res.error) {
      setError(res.error);
      return;
    }

    const refreshed = await AdminAPI.getCompanyUsers(assigning.company_id);
    setCompanyAssignments(refreshed.data || []);
    await loadCompanies();
  };

  const saveAllAssignments = async () => {
    if (!assigning || pendingAssignments.length === 0) {
      setAssigning(null);
      return;
    }

    setSubmitting(true);
    setError(null);

    for (const pending of pendingAssignments) {
      const res = await AdminAPI.createAssignment({
        user_id: pending.user_id,
        company_id: assigning.company_id,
        role_id: pending.role_id,
        is_active: true,
      });
      if (res.error) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    setPendingAssignments([]);
    setAssigning(null);
    await loadCompanies();
  };

  const clusterOptions = useMemo(
    () => clusters.map((c) => ({ value: c.cluster_id, label: c.cluster_name })),
    [clusters]
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Company Management</h1>
            <p className="text-slate-500 mt-1">Live company and assignment data</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="h-10 px-4 rounded-lg bg-[#0b1f3a] text-white text-sm font-medium inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Company
          </button>
        </div>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search company"
                className="h-10 w-full border border-slate-300 rounded-lg pl-10 pr-3 text-sm"
              />
            </div>
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="h-10 border border-slate-300 rounded-lg px-3 text-sm"
            >
              <option value="">All clusters</option>
              {clusterOptions.map((cluster) => (
                <option key={cluster.value} value={cluster.value}>{cluster.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading && <p className="text-sm text-slate-500">Loading companies...</p>}
          {!loading && companies.length === 0 && <p className="text-sm text-slate-500">No companies found.</p>}
          {!loading && companies.map((company) => (
            <div key={company.company_id} className={`rounded-xl border p-4 bg-white ${company.is_active ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{company.company_name}</h3>
                  <p className="text-xs text-slate-500">{company.cluster_name || company.cluster_id}</p>
                </div>
                <button onClick={() => toggleCompanyStatus(company)} className={company.is_active ? "text-emerald-500" : "text-slate-400"}>
                  {company.is_active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>
              <div className="mt-3 text-sm text-slate-700 space-y-1">
                <p>FY Start: {MONTHS.find((m) => m.value === (company.fin_year_start_month || 1))?.label || "-"}</p>
                <p>Assigned users: {company.user_count}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(company)} className="flex-1 h-9 text-sm rounded-lg border border-slate-300">Edit</button>
                <button onClick={() => openAssign(company)} className="flex-1 h-9 text-sm rounded-lg bg-slate-100">Assign Users</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Company" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <input
              placeholder="Company name"
              value={newCompany.company_name}
              onChange={(e) => setNewCompany((prev) => ({ ...prev, company_name: e.target.value }))}
              className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
            />
            <select
              value={newCompany.cluster_id}
              onChange={(e) => setNewCompany((prev) => ({ ...prev, cluster_id: e.target.value }))}
              className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
            >
              <option value="">Select cluster</option>
              {clusterOptions.map((cluster) => (
                <option key={cluster.value} value={cluster.value}>{cluster.label}</option>
              ))}
            </select>
            <select
              value={newCompany.fin_year_start_month}
              onChange={(e) => setNewCompany((prev) => ({ ...prev, fin_year_start_month: e.target.value }))}
              className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
          <ModalActions
            onCancel={() => setShowAdd(false)}
            onSubmit={createCompany}
            submitLabel={submitting ? "Creating..." : "Create Company"}
            disabled={submitting}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Company" onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <input
              placeholder="Company name"
              value={editCompany.company_name}
              onChange={(e) => setEditCompany((prev) => ({ ...prev, company_name: e.target.value }))}
              className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
            />
            <select
              value={editCompany.cluster_id}
              onChange={(e) => setEditCompany((prev) => ({ ...prev, cluster_id: e.target.value }))}
              className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
            >
              {clusterOptions.map((cluster) => (
                <option key={cluster.value} value={cluster.value}>{cluster.label}</option>
              ))}
            </select>
            <select
              value={editCompany.fin_year_start_month}
              onChange={(e) => setEditCompany((prev) => ({ ...prev, fin_year_start_month: e.target.value }))}
              className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
          <ModalActions
            onCancel={() => setEditing(null)}
            onSubmit={updateCompany}
            submitLabel={submitting ? "Saving..." : "Save Changes"}
            disabled={submitting}
          />
        </Modal>
      )}

      {assigning && (
        <Modal title={`Assign Users - ${assigning.company_name}`} onClose={() => setAssigning(null)}>
          <div className="space-y-3">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {/* Searchable user dropdown */}
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                  <input
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setShowUserDropdown(true);
                      setNewAssignment((prev) => ({ ...prev, user_id: "" }));
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserDropdown(true);
                    }}
                    placeholder="Search users..."
                    className="h-10 w-full border border-slate-300 rounded-lg pl-10 pr-3 text-sm"
                    autoComplete="off"
                  />
                </div>
                {showUserDropdown && (
                  <div className="absolute z-50 top-11 left-0 right-0 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-slate-500 p-3">No users found.</p>
                    ) : (
                      filteredUsers.map((user) => {
                        const displayName =
                          `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.user_email;
                        const alreadyAssigned = companyAssignments.some(
                          (a) => a.user_id === user.user_id
                        );
                        return (
                          <button
                            key={user.user_id}
                            type="button"
                            onClick={() => {
                              setNewAssignment((prev) => ({ ...prev, user_id: user.user_id }));
                              setUserSearch(displayName);
                              setShowUserDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm border-b border-slate-50 last:border-0 ${
                              alreadyAssigned
                                ? "bg-slate-50"
                                : "hover:bg-blue-50"
                            }`}
                          >
                            <p className={`font-medium ${alreadyAssigned ? "text-slate-400" : "text-slate-900"}`}>
                              {displayName}
                            </p>
                            <p className="text-xs text-slate-500">{user.user_email}</p>
                            {alreadyAssigned && (
                              <span className="text-xs text-amber-600">Already assigned</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <select
                value={newAssignment.role_id}
                onChange={(e) => setNewAssignment((prev) => ({ ...prev, role_id: e.target.value }))}
                className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addAssignment}
              disabled={!newAssignment.user_id || !newAssignment.role_id}
              className="h-9 px-3 rounded-lg bg-[#0b1f3a] text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Assignment
            </button>

            {/* Pending assignments (not yet saved) */}
            {pendingAssignments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">New Assignments</p>
                <div className="border border-blue-200 rounded-lg bg-blue-50/30">
                  {pendingAssignments.map((pending, index) => (
                    <div key={`pending-${index}`} className="flex items-center justify-between px-3 py-2 border-b border-blue-100 last:border-0">
                      <div>
                        <p className="text-sm text-slate-900">{pending.user_name}</p>
                        <p className="text-xs text-slate-500">{pending.role_name}</p>
                      </div>
                      <button
                        onClick={() => removePending(index)}
                        className="text-xs px-2 py-1 rounded border border-rose-300 text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing assignments (already in DB) */}
            <div>
              {companyAssignments.length > 0 && (
                <p className="text-xs font-medium text-slate-500 mb-1">Current Assignments</p>
              )}
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
                {companyAssignments.length === 0 && pendingAssignments.length === 0 && (
                  <p className="text-sm text-slate-500 p-3">No assigned users.</p>
                )}
                {companyAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm text-slate-900">{assignment.user_name}</p>
                      <p className="text-xs text-slate-500">{assignment.role_name}</p>
                    </div>
                    <button
                      onClick={() => removeExistingAssignment(assignment)}
                      className="text-xs px-2 py-1 rounded border border-rose-300 text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <ModalActions
            onCancel={() => { setPendingAssignments([]); setAssigning(null); }}
            onSubmit={saveAllAssignments}
            submitLabel={submitting ? "Saving..." : "Done"}
            disabled={submitting}
          />
        </Modal>
      )}
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => e.stopPropagation()}>
      <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200" onMouseDown={(e) => e.stopPropagation()}>
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
