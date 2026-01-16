"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, BarChart3, Bell, Send } from "lucide-react";

export const navItems = [
  { href: "/finance-director/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/finance-director/reports", label: "Review Reports", icon: FileText },
  { href: "/finance-director/analytics", label: "Company Analytics", icon: BarChart3 },
  { href: "/finance-director/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 h-full bg-white border-r border-slate-200 py-6 overflow-y-auto">
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive ? "bg-[#0b1f3a] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
