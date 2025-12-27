"use client";

import { LoginForm } from "@/components/auth";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function CompanyDirectorLogin() {
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    // Use GraphQL backend login as fallback
    const result = await login(email, password);
    if (result.success) {
      router.push("/company-director");
    }
    return result;
  };

  return (
    <LoginForm
      title="Company Director Login"
      subtitle="Welcome to McLarens Analytics"
      onSubmit={handleLogin}
      callbackUrl="/company-director"
    />
  );
}
