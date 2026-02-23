"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";

import { navItems } from "./Sidebar";

type HeaderUser = {
  email?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  user_email?: string;
  user_name?: string;
};

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    const auth =
      localStorage.getItem("mclarens_user") ||
      localStorage.getItem("admin-auth");
    if (auth) {
      try {
        setUser(JSON.parse(auth));
      } catch {
        setUser(null);
      }
    }
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("mclarens_token");
    localStorage.removeItem("mclarens_user");
    localStorage.removeItem("auth");
    localStorage.removeItem("director-auth");
    localStorage.removeItem("admin-auth");
    localStorage.removeItem("ceo-auth");
    router.push("/");
  };

  const getEmail = (u: HeaderUser) => u.email || u.user_email || "";

  const getDisplayName = (u: HeaderUser) => {
    const first = (u.first_name || "").trim();
    const last = (u.last_name || "").trim();
    const fullName = `${first} ${last}`.trim();
    if (fullName) return fullName;
    if (u.name && u.name.trim()) return u.name.trim();
    if (u.user_name && u.user_name.trim()) return u.user_name.trim();

    const email = getEmail(u);
    if (!email) return "User";

    const name = email.split("@")[0];
    return name
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const getInitials = (u: HeaderUser) => {
    const displayName = getDisplayName(u).trim();
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    const email = getEmail(u);
    return email ? email.substring(0, 2).toUpperCase() : "US";
  };

  return (
    <>
      <header className="bg-[#0b1f3a] text-white px-4 md:px-8 h-16 md:h-20 flex items-center justify-between z-50 relative">
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
                <span className="text-sm font-semibold">{getDisplayName(user)}</span>
                <span className="text-xs text-white/70">System Administrator</span>
              </div>
              <div className="relative">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-slate-100 flex items-center justify-center text-[#0b1f3a] font-bold text-sm">
                  {getInitials(user)}
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
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0b1f3a]/95 pt-20 px-6 md:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium transition-all ${
                    isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
