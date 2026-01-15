"use client";

import { useState } from "react";
import { Search, Filter, Download, Calendar, User, FileText, Settings, Shield, Building2, Layers, Clock } from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  action: string;
  category: "user" | "company" | "cluster" | "report" | "system" | "auth";
  details: string;
  ipAddress: string;
  status: "success" | "failed" | "warning";
}

const auditLogs: AuditLog[] = [
  { id: "1", timestamp: "2025-12-23 14:32:15", user: "Admin User", userEmail: "hmsvhettiarachchi@std.foc.sab.ac.lk", action: "User Created", category: "user", details: "Created new user: natali.craig@mclarens.lk", ipAddress: "192.168.1.45", status: "success" },
  { id: "2", timestamp: "2025-12-23 14:15:08", user: "Sahan Viranga", userEmail: "sahanviranga18@gmail.com", action: "Report Approved", category: "report", details: "Approved December 2025 report for McLarens Maritime Academy", ipAddress: "192.168.1.102", status: "success" },
  { id: "3", timestamp: "2025-12-23 13:45:22", user: "Admin User", userEmail: "hmsvhettiarachchi@std.foc.sab.ac.lk", action: "Company Updated", category: "company", details: "Updated year end for GAC Shipping Limited to December", ipAddress: "192.168.1.45", status: "success" },
  { id: "4", timestamp: "2025-12-23 12:30:00", user: "System", userEmail: "system@mclarens.lk", action: "Backup Completed", category: "system", details: "Daily database backup completed successfully", ipAddress: "10.0.0.1", status: "success" },
  { id: "5", timestamp: "2025-12-23 11:22:45", user: "Sahan Hettiarachchi", userEmail: "sahanhettiarachchi275@gmail.com", action: "Report Submitted", category: "report", details: "Submitted December 2025 actual report", ipAddress: "192.168.1.88", status: "success" },
  { id: "6", timestamp: "2025-12-23 10:15:33", user: "Unknown", userEmail: "unknown@test.com", action: "Login Failed", category: "auth", details: "Failed login attempt - invalid credentials", ipAddress: "203.45.67.89", status: "failed" },
  { id: "7", timestamp: "2025-12-23 09:45:12", user: "Admin User", userEmail: "hmsvhettiarachchi@std.foc.sab.ac.lk", action: "Role Modified", category: "user", details: "Updated permissions for Cluster Head role", ipAddress: "192.168.1.45", status: "success" },
  { id: "8", timestamp: "2025-12-22 16:30:00", user: "Admin User", userEmail: "hmsvhettiarachchi@std.foc.sab.ac.lk", action: "Cluster Created", category: "cluster", details: "Created new cluster: Renewables", ipAddress: "192.168.1.45", status: "success" },
  { id: "9", timestamp: "2025-12-22 15:20:18", user: "Orlando Diggs", userEmail: "orlando.diggs@mclarens.lk", action: "Report Rejected", category: "report", details: "Rejected November 2025 report - Finance expenses mismatch", ipAddress: "192.168.1.156", status: "warning" },
  { id: "10", timestamp: "2025-12-22 14:10:05", user: "System", userEmail: "system@mclarens.lk", action: "Session Expired", category: "auth", details: "User session expired: drew.cano@mclarens.lk", ipAddress: "10.0.0.1", status: "warning" },
];

const categoryIcons = {
  user: User,
  company: Building2,
  cluster: Layers,
  report: FileText,
  system: Settings,
  auth: Shield,
};

const categoryColors = {
  user: "bg-blue-100 text-blue-600",
  company: "bg-emerald-100 text-emerald-600",
  cluster: "bg-purple-100 text-purple-600",
  report: "bg-amber-100 text-amber-600",
  system: "bg-slate-100 text-slate-600",
  auth: "bg-red-100 text-red-600",
};

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("today");

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) ||
                         log.user.toLowerCase().includes(search.toLowerCase()) ||
                         log.details.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
            <p className="text-base text-slate-500 mt-2">Track all system activities and user actions</p>
          </div>
          <button className="flex items-center gap-2 h-11 px-5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="h-4 w-4" /> Export Logs
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
                placeholder="Search by action, user, or details..."
                className="w-full h-11 pl-11 pr-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
            >
              <option value="all">All Categories</option>
              <option value="user">User</option>
              <option value="company">Company</option>
              <option value="cluster">Cluster</option>
              <option value="report">Report</option>
              <option value="system">System</option>
              <option value="auth">Authentication</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Timestamp</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log) => {
                  const Icon = categoryIcons[log.category];
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {log.timestamp}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{log.user}</p>
                          <p className="text-xs text-slate-500">{log.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{log.action}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${categoryColors[log.category]}`}>
                          <Icon className="h-3 w-3" />
                          {log.category.charAt(0).toUpperCase() + log.category.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 max-w-xs truncate">{log.details}</p>
                        <p className="text-xs text-slate-400 mt-0.5">IP: {log.ipAddress}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                          log.status === "success" ? "bg-emerald-100 text-emerald-700" :
                          log.status === "failed" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing {filteredLogs.length} of {auditLogs.length} logs</p>
            <div className="flex gap-2">
              <button className="h-9 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Previous</button>
              <button className="h-9 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
