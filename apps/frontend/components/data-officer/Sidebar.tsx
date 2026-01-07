"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Bell, FolderOpen, XCircle } from "lucide-react";

const navItems = [
  { href: "/data-officer/dashboard", label: "Data Entry", icon: FileText },
  { href: "/data-officer/rejected-reports", label: "Rejected Reports", icon: XCircle, badge: 3 },
  { href: "/data-officer/notifications", label: "Notifications", icon: Bell },
  { href: "/data-officer/drafts", label: "Drafts", icon: FolderOpen },
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
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${
                  isActive 
                    ? "bg-white text-[#0b1f3a]" 
                    : "bg-red-500 text-white"
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
