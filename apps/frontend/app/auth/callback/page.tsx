"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, gql } from "@apollo/client";

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
  
  const { data, loading } = useQuery(GET_ME, {
    skip: status !== "authenticated",
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (status === "loading" || loading) return;
    
    if (status === "unauthenticated") {
      router.push("/login?error=auth_failed");
      return;
    }

    // Get role from GraphQL response
    const role = data?.me?.role?.toLowerCase();
    
    if (role) {
      // Redirect based on role
      let redirectPath = "/";
      
      switch (role) {
        case "data_officer":
        case "dataofficer":
          redirectPath = "/data-officer";
          break;
        case "company_director":
        case "companydirector":
          redirectPath = "/company-director";
          break;
        case "ceo":
          redirectPath = "/ceo";
          break;
        case "admin":
          redirectPath = "/admin";
          break;
        default:
          redirectPath = "/";
      }
      
      router.push(redirectPath);
    } else if (session && !loading) {
      // User authenticated but no profile yet - redirect to default
      router.push("/");
    }
  }, [status, data, loading, router, session]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Authenticating...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait while we verify your credentials</p>
      </div>
    </div>
  );
}
