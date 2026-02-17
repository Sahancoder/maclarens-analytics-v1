"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UserCheck, UserX, X } from "lucide-react";
import { AdminAPI, type AdminCompany, type AdminRole, type AdminUser } from "@/lib/api-client";

const ROLE_OPTIONS = [
  { role_id: 1, role_name: "Finance Officer" },
  { role_id: 2, role_name: "Finance Director" },
  { role_id: 3, role_name: "Admin" },
  { role_id: 4, role_name: "MD" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>(ROLE_OPTIONS);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    user_email: "",
    role_id: "",
    company_id: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadLookups = async () => {
    const [rolesRes, companiesRes] = await Promise.all([
      AdminAPI.getRoles(),
      AdminAPI.getCompaniesList({ page: 1, page_size: 1000, is_active: true }),
    ]);

    if (rolesRes.data && rolesRes.data.length > 0) setRoles(rolesRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data.companies);
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    const response = await AdminAPI.getUsers({
      page,
      page_size: 20,
      search: search || undefined,
      role_id: roleFilter === "" ? undefined : roleFilter,
      is_active: statusFilter === "all" ? undefined : statusFilter === "active",
    });

    if (response.error || !response.data) {
      setError(response.error || "Failed to load users");
      setUsers([]);
      setTotal(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }

    setUsers(response.data.users);
    setTotal(response.data.total);
    setTotalPages(response.data.total_pages);
    setLoading(false);
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, search, roleFilter, statusFilter]);

  const resetForm = () =>
    setForm({
      first_name: "",
      last_name: "",
      user_email: "",
      role_id: "",
      company_id: "",
    });

  const createUser = async () => {
    if (!form.first_name || !form.last_name || !form.user_email || !form.role_id || !form.company_id) {
      setError("All user fields are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await AdminAPI.createUser({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      user_email: form.user_email.trim(),
      role_id: Number(form.role_id),
      company_id: form.company_id,
      is_active: true,
    });

    setSubmitting(false);

    if (res.error || !res.data) {
      setError(res.error || "Failed to create user");
      return;
    }

    setShowAdd(false);
    resetForm();
    await loadUsers();
  };

  const toggleUserStatus = async (user: AdminUser) => {
    const res = await AdminAPI.updateUserStatus(user.user_id, !user.is_active);
    if (res.error) {
      setError(res.error);
      return;
    }
    await loadUsers();
  };

  const rows = useMemo(
    () =>
      users.map((user) => {
        const role = user.roles.find((r) => r.is_active) || user.roles[0];
        return {
          ...user,
          role_name: role?.role_name || "Unassigned",
          company_name: role?.company_name || "Unassigned",
        };
      }),
    [users]
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-500 mt-1">Live user records from PostgreSQL</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="h-10 px-4 rounded-lg bg-[#0b1f3a] text-white text-sm font-medium inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add User
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
                placeholder="Search by name or email"
                className="h-10 w-full border border-slate-300 rounded-lg pl-10 pr-3 text-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value ? Number(e.target.value) : "")}
              className="h-10 border border-slate-300 rounded-lg px-3 text-sm"
            >
              <option value="">All roles</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="h-10 border border-slate-300 rounded-lg px-3 text-sm"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs uppercase text-slate-500">User</th>
                  <th className="px-5 py-3 text-left text-xs uppercase text-slate-500">Role</th>
                  <th className="px-5 py-3 text-left text-xs uppercase text-slate-500">Company</th>
                  <th className="px-5 py-3 text-left text-xs uppercase text-slate-500">Status</th>
                  <th className="px-5 py-3 text-right text-xs uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-sm text-slate-500">Loading users...</td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-sm text-slate-500">No users found.</td>
                  </tr>
                )}
                {!loading && rows.map((user) => (
                  <tr key={user.user_id} className="border-t border-slate-100">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-900">{`${user.first_name || ""} ${user.last_name || ""}`.trim() || "-"}</p>
                      <p className="text-xs text-slate-500">{user.user_email}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">{user.role_name}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">{user.company_name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.is_active ? "text-emerald-700" : "text-slate-500"}`}>
                        {user.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">Total: {total}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-xs px-2 py-1 rounded border border-slate-300 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-slate-500">{page} / {totalPages || 1}</span>
              <button
                onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p))}
                disabled={!totalPages || page >= totalPages}
                className="text-xs px-2 py-1 rounded border border-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Add User</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <input
                placeholder="First name"
                value={form.first_name}
                onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
              />
              <input
                placeholder="Last name"
                value={form.last_name}
                onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
              />
              <input
                placeholder="Email"
                type="email"
                value={form.user_email}
                onChange={(e) => setForm((prev) => ({ ...prev, user_email: e.target.value }))}
                className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
              />
              <select
                value={form.role_id}
                onChange={(e) => setForm((prev) => ({ ...prev, role_id: e.target.value }))}
                className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                ))}
              </select>
              <select
                value={form.company_id}
                onChange={(e) => setForm((prev) => ({ ...prev, company_id: e.target.value }))}
                className="h-10 w-full border border-slate-300 rounded-lg px-3 text-sm"
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>{company.company_name}</option>
                ))}
              </select>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="h-9 px-3 text-sm border border-slate-300 rounded-lg">Cancel</button>
              <button
                onClick={createUser}
                disabled={submitting}
                className="h-9 px-3 text-sm rounded-lg bg-[#0b1f3a] text-white disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
