"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header, Sidebar, Footer } from "@/components/md";
import { getDashboardRoute, normalizeRole } from "@/lib/role-routing";

export default function MDDashboardLayout({
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
      router.push("/md/login");
      return;
    }

    try {
      const user = JSON.parse(userRaw) as { role?: string };
      const role = normalizeRole(user.role);
      const target = getDashboardRoute(role);

      if (target && target !== "/md/dashboard") {
        router.push(target);
        return;
      }
    } catch {
      router.push("/md/login");
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
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - hidden on mobile, fixed width on desktop */}
        <aside className="hidden md:flex md:flex-shrink-0 md:w-60 lg:w-64">
          <Sidebar />
        </aside>
        {/* Main content - takes remaining space, prevents overflow */}
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
          <div className="w-full max-w-full">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

