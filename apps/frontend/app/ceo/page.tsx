"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CEORedirect() {
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("ceo-auth");
    if (auth) {
      router.push("/ceo/dashboard");
    } else {
      router.push("/ceo/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin h-10 w-10 border-4 border-[#0b1f3a] border-t-transparent rounded-full" />
    </div>
  );
}
