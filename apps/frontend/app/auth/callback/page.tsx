"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Auth Callback Page
 * ------------------
 * After Microsoft Entra ID authentication, NextAuth redirects here.
 * This page:
 *   1. Waits for the NextAuth session (which contains the user's Microsoft email).
 *   2. Reads the 'portal' query param (set by LoginScreen) to know which portal
 *      the user was trying to access.
 *   3. Calls the backend /auth/check-access with the Microsoft email + portal
 *      to verify the user exists in user_master (is_active=true) and has
 *      the required role_id in user_company_role_map (is_active=true).
 *   4. If access is granted, fetches a backend JWT via /auth/microsoft-login
 *      and redirects to the portal's dashboard.
 *   5. If access is denied, shows an error message.
 *
 * No hardcoded emails — everything comes from the Microsoft Entra ID session.
 *
 * Portal → Allowed role_ids:
 *   finance-officer  → 1 (Finance Officer), 3 (Admin)
 *   finance-director → 2 (Finance Director), 3 (Admin)
 *   system-admin     → 3 (Admin)
 *   md               → 4 (MD), 3 (Admin)
 */

function getApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
    "http://localhost:8000";
  return raw.replace(/\/graphql\/?$/, "");
}

const DASHBOARD_ROUTES: Record<string, string> = {
  "finance-officer": "/finance-officer/dashboard",
  "finance-director": "/finance-director/dashboard",
  "system-admin": "/system-admin/dashboard",
  md: "/md/dashboard",
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Still loading session from NextAuth
    if (status === "loading") return;

    // Not authenticated → send back to home
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }

    // Session is authenticated — the email comes from Microsoft Entra ID
    async function verifyAccessAndLogin() {
      const email = session?.user?.email;
      if (!email) {
        setError(
          "No email found in your Microsoft session. Please try logging in again."
        );
        return;
      }

      // Get the portal from the query param or localStorage
      // (LoginScreen stores it before redirecting to Microsoft)
      const portal =
        searchParams.get("portal") ||
        (typeof window !== "undefined"
          ? localStorage.getItem("mclarens_login_portal")
          : null) ||
        "";

      // Clean up localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("mclarens_login_portal");
      }

      const apiBase = getApiBaseUrl();

      if (!portal) {
        setError(
          "No portal specified. Please go back and login from a specific portal page."
        );
        return;
      }

      // ── Step 1: Verify portal access ────────────────────────────────
      // POST /auth/check-access { email, portal }
      // Backend SQL:
      //   SELECT EXISTS (
      //     SELECT 1 FROM user_master um
      //     JOIN user_company_role_map ucrm ON um.user_id = ucrm.user_id
      //     WHERE LOWER(TRIM(um.user_email)) = :email
      //       AND um.is_active = true
      //       AND ucrm.is_active = true
      //       AND ucrm.role_id IN (:allowed_role_ids)
      //   )
      try {
        const checkRes = await fetch(`${apiBase}/auth/check-access`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, portal }),
        });

        if (!checkRes.ok) {
          setError(
            "Unable to verify your access. Please try again or contact your administrator."
          );
          return;
        }

        const checkData = await checkRes.json();

        if (!checkData.has_access) {
          setError(
            `Access denied. Your Microsoft account (${email}) does not have the required role ` +
              `to access the "${portal}" portal. Please contact your administrator.`
          );
          return;
        }

        // ── Step 2: Get backend JWT token ──────────────────────────────
        // Use the Microsoft ID token (or Access Token) to authenticate with
        // the backend and get a backend-issued JWT.
        // This is CRITICAL: Without this token, backend API calls will fail with 401.
        const idToken = session?.idToken || session?.accessToken;

        if (!idToken) {
          setError("Session token missing. Please try logging in again.");
          return;
        }

        try {
          const loginRes = await fetch(`${apiBase}/auth/microsoft-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: idToken,
              portal: portal,
            }),
          });

          if (!loginRes.ok) {
            console.error("Backend login failed:", loginRes.status, loginRes.statusText);
            const errData = await loginRes.json().catch(() => ({}));
            setError(
              errData.detail ||
              "Failed to initialize your session with the server. Please check your connection."
            );
            return;
          }

          const loginData = await loginRes.json();
          
          if (!loginData.access_token) {
            setError("Server returned an invalid session token.");
            return;
          }

          // Store the backend JWT for API calls
          localStorage.setItem("mclarens_token", loginData.access_token);
          
          // Store user info for UI
          if (loginData.user) {
            localStorage.setItem("mclarens_user", JSON.stringify(loginData.user));
          }

        } catch (e) {
          console.error("Login request failed:", e);
          setError("Failed to connect to the authentication server.");
          return;
        }

        // ── Step 3: Redirect to portal dashboard ───────────────────────
        const redirectTo = DASHBOARD_ROUTES[portal];
        if (redirectTo) {
          router.replace(redirectTo);
        } else {
          setError(`Unknown portal "${portal}". Please contact your administrator.`);
        }
      } catch (e) {
        console.error("Access verification failed:", e);
        setError(
          "Unable to connect to the server. Please check your connection and try again."
        );
      }
    }

    verifyAccessAndLogin();
  }, [status, session, router, searchParams]);

  // ── Render: Error state ────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.replace("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Loading spinner ────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-lg">Signing you in...</p>
        <p className="text-gray-600 text-sm mt-2">
          Verifying your access permissions
        </p>
      </div>
    </div>
  );
}
