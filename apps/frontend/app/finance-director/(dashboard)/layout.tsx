"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header, Sidebar, Footer } from "@/components/finance-director";
import { getDashboardRoute, normalizeRole } from "@/lib/role-routing";

export default function FinanceDirectorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("mclarens_token");
    const userRaw = localStorage.getItem("mclarens_user");

    if (!token || !userRaw) {
      router.push("/finance-director/login");
      return;
    }

    try {
      const user = JSON.parse(userRaw) as { role?: string };
      const role = normalizeRole(user.role);
      const target = getDashboardRoute(role);

      if (target && target !== "/finance-director/dashboard") {
        router.push(target);
        return;
      }
    } catch {
      router.push("/finance-director/login");
      return;
    }

    setIsAuthenticated(true);
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-10 w-10 border-4 border-[#0b1f3a] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <div className="flex flex-1">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <Footer />
    </div>
  );
}

