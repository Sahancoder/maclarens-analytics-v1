"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  LineChart,
  Layers,
  FileText,
  Bell,
} from "lucide-react";

const navItems = [
  { href: "/ceo/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/ceo/performance", label: "Performance", icon: TrendingUp },
  { href: "/ceo/risks", label: "Risks", icon: AlertTriangle },
  { href: "/ceo/forecast", label: "Forecast", icon: LineChart },
  { href: "/ceo/scenarios", label: "Scenarios", icon: Layers },
  { href: "/ceo/board", label: "Board View", icon: FileText },
  { href: "/ceo/notifications", label: "Notifications", icon: Bell },
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
