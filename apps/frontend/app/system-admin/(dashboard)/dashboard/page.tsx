"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AdminAPI, FDAPI, HealthAPI, type AdminActivity, type AdminDashboardStats } from "@/lib/api-client";

type HealthPayload = {
  status?: string;
  checks?: Record<string, { status?: string; latency_ms?: number; response_time_ms?: number }>;
  components?: Record<string, { status?: string; latency_ms?: number; response_time_ms?: number }>;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const [statsRes, activityRes, pendingRes, healthRes] = await Promise.all([
      AdminAPI.getDashboardStats(),
      AdminAPI.getRecentActivity(8),
      FDAPI.getPendingReports(),
      HealthAPI.full(),
    ]);

    if (statsRes.error) setError(statsRes.error);
    if (statsRes.data) setStats(statsRes.data);
    if (activityRes.data) setActivities(activityRes.data.activities);
    if (pendingRes.data) setPendingReports((pendingRes.data.reports || []).slice(0, 5));
    if (healthRes.data) setHealth(healthRes.data as unknown as HealthPayload);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const checks = useMemo(() => health?.components || health?.checks || {}, [health]);
  const healthRows = useMemo(
    () => [
      { name: "Analytics API", status: health?.status || "unknown", latency: "-" },
      {
        name: "PostgreSQL Database",
        status: checks.database?.status || "unknown",
        latency: checks.database?.latency_ms || checks.database?.response_time_ms || "-",
      },
      {
        name: "Redis",
        status: checks.redis?.status || "unknown",
        latency: checks.redis?.latency_ms || checks.redis?.response_time_ms || "-",
      },
      {
        name: "Email Service",
        status: checks.email?.status || "not_configured",
        latency: "-",
      },
    ],
    [health, checks]
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">System Dashboard</h1>
          <p className="text-sm md:text-base text-slate-500 mt-2">Live platform metrics and activity</p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Failed to load dashboard data: {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats?.total_users ?? 0} loading={loading} />
          <StatCard label="Active Companies" value={stats?.active_companies ?? 0} loading={loading} />
          <StatCard label="Clusters" value={stats?.total_clusters ?? 0} loading={loading} />
          <StatCard label="Pending Reports" value={stats?.pending_reports ?? 0} loading={loading} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">System Health</h2>
            <div className="space-y-2">
              {healthRows.map((row) => {
                const isOk = row.status === "healthy" || row.status === "operational";
                const isNotConfigured = row.status === "not_configured" || row.status === "not_available";
                const label = isNotConfigured ? "Not configured" : isOk ? "Operational" : "Degraded";
                const color = isNotConfigured ? "bg-slate-400" : isOk ? "bg-emerald-500" : "bg-rose-500";

                return (
                  <div key={row.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-700">{row.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{row.latency === "-" ? "-" : `${row.latency}ms`}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${color}`} />
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Activity</h2>
            <div className="space-y-3">
              {!loading && activities.length === 0 && <p className="text-sm text-slate-500">No recent activity.</p>}
              {activities.map((activity) => (
                <div key={activity.id} className="border-b border-slate-100 last:border-0 pb-2">
                  <p className="text-sm font-medium text-slate-800">{activity.details || activity.action}</p>
                  <p className="text-xs text-slate-500">{activity.user_email || "System"}</p>
                  <p className="text-xs text-slate-400">
                    {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : "-"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Pending Reports</h2>
            <div className="space-y-3">
              {!loading && pendingReports.length === 0 && <p className="text-sm text-slate-500">No pending reports.</p>}
              {pendingReports.map((report) => (
                <div key={`${report.id || report.company_id}-${report.period_id || report.month}`} className="border-b border-slate-100 last:border-0 pb-2">
                  <p className="text-sm font-medium text-slate-800">{report.company_name}</p>
                  <p className="text-xs text-slate-500">{report.month_name} {report.year}</p>
                  <p className="text-xs text-slate-400">By {report.submitted_by_name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "..." : value}</p>
    </div>
  );
}
