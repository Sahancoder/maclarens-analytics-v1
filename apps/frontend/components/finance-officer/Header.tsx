"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import { Menu, X, LogOut, FileText, Bell, FolderOpen, XCircle } from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/finance-officer/dashboard", label: "Actual Entry", icon: FileText },
  { href: "/finance-officer/rejected-reports", label: "Rejected Reports", icon: XCircle, badge: 3 },
  { href: "/finance-officer/notifications", label: "Notifications", icon: Bell },
  { href: "/finance-officer/drafts", label: "Drafts", icon: FolderOpen },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    const auth =
      localStorage.getItem("mclarens_user") ||
      localStorage.getItem("auth");
    if (auth) {
      setUser(JSON.parse(auth));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("mclarens_token");
    localStorage.removeItem("mclarens_user");
    localStorage.removeItem("auth");
    localStorage.removeItem("director-auth");
    localStorage.removeItem("admin-auth");
    localStorage.removeItem("ceo-auth");
    router.push("/");
  };

  const getInitials = (email: string) => {
    const name = email.split("@")[0];
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (email: string) => {
    const name = email.split("@")[0];
    return name
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  return (
    <>
      <header className="bg-[#0b1f3a] text-white px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-1.5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <button onClick={() => router.push("/")} className="cursor-pointer hover:opacity-80 transition-opacity">
            <Image
              src="/jubilee-logo-lock-up.svg"
              alt="McLarens Group"
              width={180}
              height={60}
              className="h-10 md:h-12 w-auto"
            />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold">
                  {getDisplayName(user.email)}
                </span>
                <span className="text-xs text-white/70">Finance Officer</span>
              </div>
              <div className="relative">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-slate-100 flex items-center justify-center text-[#0b1f3a] font-bold text-sm">
                  {getInitials(user.email)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-[#0b1f3a]" />
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-50">
          <nav className="px-3 py-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive
                      ? "bg-slate-100 text-[#0b1f3a]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${
                      isActive 
                        ? "bg-[#0b1f3a] text-white" 
                        : "bg-red-500 text-white"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
