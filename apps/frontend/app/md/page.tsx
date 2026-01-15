"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDashboardRoute, normalizeRole } from "@/lib/role-routing";

export default function CEORedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("mclarens_token");
    const userRaw = localStorage.getItem("mclarens_user");

    if (!token || !userRaw) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userRaw) as { role?: string };
      const role = normalizeRole(user.role);
      const target = getDashboardRoute(role);
      router.replace(target || "/login");
    } catch {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin h-10 w-10 border-4 border-[#0b1f3a] border-t-transparent rounded-full" />
    </div>
  );
}
