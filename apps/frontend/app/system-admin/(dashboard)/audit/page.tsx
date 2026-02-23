"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Download, Calendar, User, FileText, Settings, Shield, Building2, Layers, Clock, AlertCircle, Loader2 } from "lucide-react";
import { AdminAPI, AdminActivity } from "@/lib/api-client";
import { format } from "date-fns";

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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await AdminAPI.getRecentActivity(100);
      if (response.data) {
        const mappedLogs = response.data.activities.map(mapActivityToLog);
        setLogs(mappedLogs);
        setError(null);
      } else {
        setError(response.error || "Failed to load audit logs");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const mapActivityToLog = (activity: AdminActivity): AuditLog => {
    // Map entity_type to category
    let category: AuditLog["category"] = "system";
    const entity = activity.entity_type?.toLowerCase() || "";
    if (entity.includes("user") || entity.includes("assignment")) category = "user";
    else if (entity.includes("company")) category = "company";
    else if (entity.includes("cluster")) category = "cluster";
    else if (entity.includes("report") || entity.includes("budget") || entity.includes("actual")) category = "report";
    else if (entity.includes("auth")) category = "auth";

    // Determine status (default to success as most logs are successful actions)
    let status: AuditLog["status"] = "success";
    if (activity.action.toLowerCase().includes("fail")) status = "failed";
    else if (activity.action.toLowerCase().includes("reject")) status = "warning";

    return {
      id: activity.id,
      timestamp: activity.timestamp ? format(new Date(activity.timestamp), "yyyy-MM-dd HH:mm:ss") : "-",
      user: activity.user_name || "System",
      userEmail: activity.user_email || "system@mclarens.local",
      action: activity.action.replace(/_/g, " "),
      category: category,
      details: activity.details || "-",
      ipAddress: "-", // Not captured in backend yet
      status: status,
    };
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) ||
                         log.user.toLowerCase().includes(search.toLowerCase()) ||
                         log.details.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    
    // Simple date range logic (can be expanded)
    let matchesDate = true;
    if (dateRange !== "all") {
       const logDate = new Date(log.timestamp);
       const now = new Date();
       if (dateRange === "today") {
         matchesDate = logDate.toDateString() === now.toDateString();
       } else if (dateRange === "week") {
         const weekAgo = new Date(now.setDate(now.getDate() - 7));
         matchesDate = logDate >= weekAgo;
       } else if (dateRange === "month") {
         const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
         matchesDate = logDate >= monthAgo;
       }
    }
    
    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
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
          <button 
            onClick={fetchLogs}
            className="flex items-center gap-2 h-11 px-5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" /> Refresh Logs
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
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {loading ? (
             <div className="flex flex-col items-center justify-center h-64">
               <Loader2 className="h-8 w-8 text-slate-400 animate-spin mb-2" />
               <p className="text-slate-500">Loading audit logs...</p>
             </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-64 text-red-500">
               <AlertCircle className="h-8 w-8 mb-2" />
               <p>{error}</p>
               <button onClick={fetchLogs} className="mt-4 text-sm underline hover:text-red-700">Try Again</button>
             </div>
          ) : filteredLogs.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <FileText className="h-12 w-12 mb-2 opacity-20" />
               <p>No logs found matching your filters</p>
             </div>
          ) : (
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
                  const Icon = categoryIcons[log.category] || categoryIcons.system;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${categoryColors[log.category] || "bg-gray-100 text-gray-600"}`}>
                          <Icon className="h-3 w-3" />
                          {log.category.charAt(0).toUpperCase() + log.category.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 max-w-xs truncate" title={log.details}>{log.details}</p>
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
          )}
          </div>
          
          {/* Pagination Controls - Visual Only for now as we load all logs up to limit */}
          {!loading && !error && filteredLogs.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-500">Showing {filteredLogs.length} logs</p>
              <div className="flex gap-2">
                <button disabled className="h-9 px-4 text-sm font-medium text-slate-400 bg-slate-50 rounded-lg cursor-not-allowed">Previous</button>
                <button disabled className="h-9 px-4 text-sm font-medium text-slate-400 bg-slate-50 rounded-lg cursor-not-allowed">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
