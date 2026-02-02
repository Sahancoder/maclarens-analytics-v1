"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Layers,
  Settings,
  FileText,
  Bell,
  ClipboardList,
  FolderOpen,
  FileSpreadsheet,
} from "lucide-react";

export const navItems = [
  { href: "/system-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/system-admin/users", label: "User Management", icon: Users },
  { href: "/system-admin/companies", label: "Companies", icon: Building2 },
  { href: "/system-admin/clusters", label: "Clusters", icon: Layers },
  { href: "/system-admin/budget-entry", label: "Budget Entry", icon: ClipboardList },
  { href: "/system-admin/actual-entry", label: "Actual Entry", icon: FileSpreadsheet },
  { href: "/system-admin/budget-drafts", label: "Budget Drafts", icon: FolderOpen },
  { href: "/system-admin/audit", label: "Audit Logs", icon: FileText },
  { href: "/system-admin/notifications", label: "Notifications", icon: Bell },
  { href: "/system-admin/settings", label: "Settings", icon: Settings },
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
                isActive
                  ? "bg-[#0b1f3a] text-white"
                  : "text-slate-600 hover:bg-slate-100"
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
