"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, gql } from "@apollo/client";
import { getDashboardRoute, normalizeRole } from "@/lib/role-routing";

const GET_ME = gql`
  query Me {
    me {
      id
      email
      name
      role
      companyId
      clusterId
    }
  }
`;

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const idToken = session?.idToken;

  const { data, loading } = useQuery(GET_ME, {
    skip: status !== "authenticated" || !idToken,
    fetchPolicy: "network-only",
    context: {
      headers: idToken ? { authorization: `Bearer ${idToken}` } : {},
    },
  });

  useEffect(() => {
    if (idToken) {
      localStorage.setItem("mclarens_token", idToken);
    }
  }, [idToken]);

  const role = useMemo(() => normalizeRole(data?.me?.role), [data?.me?.role]);
  const dashboardRoute = useMemo(() => getDashboardRoute(role), [role]);

  useEffect(() => {
    if (status === "loading" || loading) return;

    if (status === "unauthenticated") {
      router.push("/login?error=auth_failed");
      return;
    }

    if (!data?.me) {
      setError("You are not provisioned. Contact administrator.");
      return;
    }

    const hasScope =
      role === "DATA_OFFICER" || role === "COMPANY_DIRECTOR"
        ? Boolean(data.me.companyId || data.me.clusterId)
        : true;

    if (!hasScope) {
      setError("You are not provisioned. Contact administrator.");
      return;
    }

    if (dashboardRoute) {
      localStorage.removeItem("auth");
      localStorage.removeItem("director-auth");
      localStorage.removeItem("admin-auth");
      localStorage.removeItem("ceo-auth");
      localStorage.setItem("mclarens_user", JSON.stringify(data.me));
      router.push(dashboardRoute);
      return;
    }

    setError("Your account does not have an assigned role.");
  }, [status, loading, data, router, role, dashboardRoute]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-600">{error ? "Access blocked" : "Authenticating..."}</p>
        <p className="text-gray-400 text-sm mt-2">
          {error || "Please wait while we verify your credentials"}
        </p>
      </div>
    </div>
  );
}
