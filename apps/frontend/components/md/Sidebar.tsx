"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  TrendingUp,
  FileText,
  Bell,
} from "lucide-react";

// Unified hierarchy: Group → Clusters → Risk → Forecast
export const navItems = [
  { href: "/md/dashboard", label: "Group Overview", icon: LayoutDashboard, description: "Strategic snapshot" },
  { href: "/md/performance", label: "Cluster Drilldown", icon: Building2, description: "Cluster → Company" },
  /* Future Development
  { href: "/md/risks", label: "Risk Analysis", icon: AlertTriangle, description: "Variance intelligence" },
  { href: "/md/forecast", label: "Forecast", icon: TrendingUp, description: "Year-end projections" },
  { href: "/md/board", label: "Board Pack", icon: FileText, description: "Executive summary" },
  { href: "/md/notifications", label: "Alerts", icon: Bell, description: "Action items" },
  */
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 h-full bg-white border-r border-slate-200 py-6 overflow-y-auto">
      {/* Hierarchy indicator */}
      <div className="px-4 mb-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Navigation Flow</p>
        <p className="text-[10px] text-slate-400 mt-1">Group → Cluster → Company</p>
      </div>
      
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-[#0b1f3a] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                <p className={`text-[10px] truncate ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
