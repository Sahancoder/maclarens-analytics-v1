"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileText, BarChart3, User, MessageSquare, Bell } from "lucide-react";

const navItems = [
  { href: "/company-director/dashboard", label: "Budget Entry", icon: ClipboardList },
  { href: "/company-director/reports", label: "View Report", icon: FileText },
  { href: "/company-director/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/company-director/profile", label: "User Profile", icon: User },
  { href: "/company-director/comments", label: "Comments", icon: MessageSquare },
  { href: "/company-director/notifications", label: "Notifications", icon: Bell },
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
