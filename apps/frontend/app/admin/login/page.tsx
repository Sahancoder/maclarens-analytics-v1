"use client";

import { LoginForm } from "@/components/auth";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    // Use GraphQL backend login as fallback
    const result = await login(email, password);
    if (result.success) {
      router.push("/admin");
    }
    return result;
  };

  return (
    <LoginForm
      title="System Administrator Login"
      subtitle="Welcome to McLarens Analytics"
      onSubmit={handleLogin}
      callbackUrl="/admin"
    />
  );
}
