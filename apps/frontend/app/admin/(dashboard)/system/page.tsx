"use client";

import { useState } from "react";
import { Activity, Database, Shield, Server, HardDrive, Cpu, MemoryStick, Clock, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface Service {
  id: string;
  name: string;
  status: "operational" | "degraded" | "down";
  latency: string;
  uptime: string;
  lastCheck: string;
  icon: any;
}

interface Metric {
  label: string;
  value: string;
  max: string;
  percentage: number;
  status: "good" | "warning" | "critical";
}

const services: Service[] = [
  { id: "1", name: "Analytics API", status: "operational", latency: "45ms", uptime: "99.98%", lastCheck: "30 sec ago", icon: Activity },
  { id: "2", name: "PostgreSQL Database", status: "operational", latency: "12ms", uptime: "99.99%", lastCheck: "30 sec ago", icon: Database },
  { id: "3", name: "Auth Service (Entra ID)", status: "operational", latency: "89ms", uptime: "99.95%", lastCheck: "30 sec ago", icon: Shield },
  { id: "4", name: "File Storage (Azure Blob)", status: "operational", latency: "23ms", uptime: "99.99%", lastCheck: "30 sec ago", icon: Server },
  { id: "5", name: "Email Service", status: "degraded", latency: "250ms", uptime: "98.50%", lastCheck: "30 sec ago", icon: Server },
  { id: "6", name: "Backup Service", status: "operational", latency: "N/A", uptime: "100%", lastCheck: "2 hours ago", icon: HardDrive },
];

const systemMetrics: Metric[] = [
  { label: "CPU Usage", value: "34%", max: "100%", percentage: 34, status: "good" },
  { label: "Memory Usage", value: "6.2 GB", max: "16 GB", percentage: 39, status: "good" },
  { label: "Disk Usage", value: "245 GB", max: "500 GB", percentage: 49, status: "good" },
  { label: "Network I/O", value: "125 Mbps", max: "1 Gbps", percentage: 12, status: "good" },
];

const recentIncidents = [
  { id: "1", title: "Email Service Degradation", status: "investigating", time: "Started 45 min ago", description: "Increased latency in email delivery" },
  { id: "2", title: "Database Maintenance", status: "resolved", time: "Resolved 2 days ago", description: "Scheduled maintenance completed successfully" },
  { id: "3", title: "API Rate Limiting", status: "resolved", time: "Resolved 5 days ago", description: "Temporary rate limiting due to high traffic" },
];

export default function SystemHealthPage() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const operationalCount = services.filter((s) => s.status === "operational").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const downCount = services.filter((s) => s.status === "down").length;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">System Health</h1>
            <p className="text-base text-slate-500 mt-2">Monitor system performance and service status</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 h-11 px-5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Operational</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{operationalCount}</p>
            <p className="text-xs text-slate-500 mt-1">services running normally</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Degraded</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{degradedCount}</p>
            <p className="text-xs text-slate-500 mt-1">services with issues</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Down</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{downCount}</p>
            <p className="text-xs text-slate-500 mt-1">services offline</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Services Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Service Status</h2>
            <div className="space-y-4">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <div key={service.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{service.name}</p>
                        <p className="text-xs text-slate-500">Uptime: {service.uptime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">{service.latency}</span>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        service.status === "operational" ? "bg-emerald-100 text-emerald-700" :
                        service.status === "degraded" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        <div className={`h-2 w-2 rounded-full ${
                          service.status === "operational" ? "bg-emerald-500" :
                          service.status === "degraded" ? "bg-amber-500" :
                          "bg-red-500"
                        }`} />
                        {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Metrics */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-5">Resource Usage</h2>
              <div className="space-y-5">
                {systemMetrics.map((metric, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                      <span className="text-sm text-slate-500">{metric.value} / {metric.max}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          metric.percentage < 60 ? "bg-emerald-500" :
                          metric.percentage < 80 ? "bg-amber-500" :
                          "bg-red-500"
                        }`}
                        style={{ width: `${metric.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Incidents */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-5">Recent Incidents</h2>
              <div className="space-y-4">
                {recentIncidents.map((incident) => (
                  <div key={incident.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{incident.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{incident.description}</p>
                        <p className="text-xs text-slate-400 mt-2">{incident.time}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        incident.status === "resolved" ? "bg-emerald-100 text-emerald-700" :
                        incident.status === "investigating" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
