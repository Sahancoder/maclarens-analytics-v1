"use client";

const stats = [
  { label: "Total Users", value: "48", change: "+3 this month", borderColor: "border-l-[#0b1f3a]" },
  { label: "Active Companies", value: "32", change: "2 inactive", borderColor: "border-l-[#0b1f3a]" },
  { label: "Clusters", value: "12", change: "All active", borderColor: "border-l-[#0b1f3a]" },
  { label: "Pending Reports", value: "7", change: "Awaiting review", borderColor: "border-l-amber-500" },
];

const systemHealth = [
  { name: "Analytics API", status: "operational", latency: "45ms" },
  { name: "PostgreSQL Database", status: "operational", latency: "12ms" },
  { name: "Auth Service (Entra ID)", status: "operational", latency: "89ms" },
  { name: "File Storage", status: "operational", latency: "23ms" },
];

const recentActivity = [
  { action: "User Created", detail: "natali.craig@mclarens.lk added as Data Officer", time: "2 hours ago", type: "user" },
  { action: "Company Updated", detail: "GAC Shipping Limited - Year end changed to December", time: "5 hours ago", type: "company" },
  { action: "Role Modified", detail: "Finance Director permissions updated", time: "1 day ago", type: "role" },
  { action: "Cluster Created", detail: "New cluster 'Renewables' added", time: "2 days ago", type: "cluster" },
  { action: "User Deactivated", detail: "john.doe@mclarens.lk account deactivated", time: "3 days ago", type: "user" },
];

const pendingApprovals = [
  { company: "McLarens Maritime Academy", month: "December 2025", submittedBy: "Sahan Hettiarachchi", status: "pending" },
  { company: "GAC Shipping Limited", month: "December 2025", submittedBy: "Natali Craig", status: "pending" },
  { company: "Spectra Logistics", month: "November 2025", submittedBy: "Drew Cano", status: "in_review" },
];

export default function AdminDashboard() {
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">System Dashboard</h1>
          <p className="text-base text-slate-500 mt-2">Platform overview and system health monitoring</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className={`bg-white rounded-lg border border-slate-200 border-l-4 ${stat.borderColor} p-6`}>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <p className="text-4xl font-bold text-[#0b1f3a] mt-2">{stat.value}</p>
              <p className="text-sm text-slate-400 mt-2">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">System Health</h2>
            <div className="space-y-3">
              {systemHealth.map((service, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-700">{service.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400">{service.latency}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">Operational</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === "user" ? "bg-[#0b1f3a]" :
                    activity.type === "company" ? "bg-[#0b1f3a]" :
                    activity.type === "role" ? "bg-[#0b1f3a]" :
                    "bg-[#0b1f3a]"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{activity.action}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{activity.detail}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Reports */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Pending Reports</h2>
            <div className="space-y-3">
              {pendingApprovals.map((report, i) => (
                <div key={i} className="py-3 border-b border-slate-100 last:border-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{report.company}</p>
                      <p className="text-xs text-slate-500 mt-1">{report.month}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Submitted by {report.submittedBy}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded ${
                      report.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {report.status === "pending" ? "Pending" : "In Review"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 h-10 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors">
              View All Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
