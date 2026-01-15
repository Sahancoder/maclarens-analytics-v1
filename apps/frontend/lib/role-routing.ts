"use client";

export type AppRole =
  | "DATA_OFFICER"
  | "FINANCE_OFFICER"
  | "COMPANY_DIRECTOR"
  | "FINANCE_DIRECTOR"
  | "CEO"
  | "MD"
  | "SYSTEM_ADMIN"
  | "ADMIN";

export function normalizeRole(role?: string | null): AppRole | null {
  if (!role) return null;
  const normalized = role.toUpperCase().replace(/[\s-]+/g, "_");

  // Finance Officer (previously Data Officer)
  if (normalized === "FINANCE_OFFICER" || normalized === "DATA_OFFICER") return "FINANCE_OFFICER";
  
  // Finance Director (previously Company Director)
  if (normalized === "FINANCE_DIRECTOR" || normalized === "COMPANY_DIRECTOR") return "FINANCE_DIRECTOR";
  
  // MD (previously CEO)
  if (normalized === "MD" || normalized === "CEO") return "MD";
  
  // System Admin
  if (normalized === "SYSTEM_ADMIN" || normalized === "ADMIN") return "SYSTEM_ADMIN";

  return null;
}

export function getDashboardRoute(role?: string | null): string | null {
  const normalized = normalizeRole(role);
  if (!normalized) return null;

  switch (normalized) {
    case "FINANCE_OFFICER":
      return "/finance-officer/dashboard";
    case "FINANCE_DIRECTOR":
      return "/finance-director/dashboard";
    case "MD":
      return "/md/dashboard";
    case "SYSTEM_ADMIN":
      return "/system-admin/dashboard";
    default:
      return null;
  }
}
