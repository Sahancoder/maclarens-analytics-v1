"use client";

export type AppRole =
  | "DATA_OFFICER"
  | "COMPANY_DIRECTOR"
  | "CEO"
  | "SYSTEM_ADMIN"
  | "ADMIN";

export function normalizeRole(role?: string | null): AppRole | null {
  if (!role) return null;
  const normalized = role.toUpperCase().replace(/[\s-]+/g, "_");

  if (normalized === "SYSTEM_ADMIN") return "SYSTEM_ADMIN";
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "CEO") return "CEO";
  if (normalized === "COMPANY_DIRECTOR") return "COMPANY_DIRECTOR";
  if (normalized === "DATA_OFFICER") return "DATA_OFFICER";

  return null;
}

export function getDashboardRoute(role?: string | null): string | null {
  const normalized = normalizeRole(role);
  if (!normalized) return null;

  switch (normalized) {
    case "DATA_OFFICER":
      return "/data-officer/dashboard";
    case "COMPANY_DIRECTOR":
      return "/company-director/dashboard";
    case "CEO":
      return "/ceo/dashboard";
    case "SYSTEM_ADMIN":
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return null;
  }
}
