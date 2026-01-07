"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header, Sidebar } from "@/components/data-officer";
import { getDashboardRoute, normalizeRole } from "@/lib/role-routing";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("mclarens_token");
    const userRaw = localStorage.getItem("mclarens_user");

    if (!token || !userRaw) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userRaw) as { role?: string };
      const role = normalizeRole(user.role);
      const target = getDashboardRoute(role);

      if (target && target !== "/data-officer/dashboard") {
        router.push(target);
        return;
      }
    } catch {
      router.push("/login");
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
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Fixed Header */}
      <div className="flex-shrink-0">
        <Header />
      </div>
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar - hidden on mobile */}
        <div className="hidden md:block flex-shrink-0">
          <Sidebar />
        </div>
        
        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
