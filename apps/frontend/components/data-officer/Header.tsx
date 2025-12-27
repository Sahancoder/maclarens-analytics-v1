"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Bell, FolderOpen, User, MessageSquare } from "lucide-react";

const navItems = [
  { href: "/data-officer/dashboard", label: "Data entry", icon: FileText },
  { href: "/data-officer/notifications", label: "Notifications", icon: Bell },
  { href: "/data-officer/drafts", label: "Drafts", icon: FolderOpen },
  { href: "/data-officer/profile", label: "User Profile", icon: User },
  { href: "/data-officer/comments", label: "Comments", icon: MessageSquare },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (auth) {
      setUser(JSON.parse(auth));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    router.push("/data-officer/login");
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
      {/* Header - responsive height */}
      <header className="bg-[#0b1f3a] text-white px-2 sm:px-4 md:px-8 lg:px-12 h-14 sm:h-16 md:h-20 lg:h-24 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            className="md:hidden p-1.5 sm:p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
          </button>
          <Image
            src="/jubilee-logo-lock-up.svg"
            alt="McLarens Group"
            width={220}
            height={70}
            className="h-8 sm:h-10 md:h-14 lg:h-16 w-auto"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
          {user && (
            <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-base lg:text-lg font-semibold">
                  {getDisplayName(user.email)}
                </span>
                <span className="text-sm lg:text-base text-white/70">Budget officer</span>
              </div>
              <div className="relative">
                <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base lg:text-lg">
                  {getInitials(user.email)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 bg-green-500 rounded-full border-2 border-[#0b1f3a]" />
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 sm:p-2 md:p-3 hover:bg-white/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-14 sm:top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-50">
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
