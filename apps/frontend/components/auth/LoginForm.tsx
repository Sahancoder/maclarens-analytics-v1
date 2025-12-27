"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";

interface LoginFormProps {
  title: string;
  subtitle: string;
  onSubmit?: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  alternateLoginText?: string;
  alternateLoginHref?: string;
  callbackUrl?: string;
}

export function LoginForm({
  title,
  subtitle,
  onSubmit,
  alternateLoginText,
  alternateLoginHref,
  callbackUrl = "/auth/callback",
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onSubmit) return;
    
    setError("");
    setLoading(true);

    const result = await onSubmit(email, password);
    if (!result.success && result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleMicrosoftLogin = async () => {
    setMicrosoftLoading(true);
    setError("");
    
    try {
      await signIn("azure-ad", { callbackUrl });
    } catch (err) {
      setError("Failed to initiate Microsoft login");
      setMicrosoftLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Background Image */}
      <div className="hidden lg:block lg:w-[52%] relative">
        <Image
          src="/login-bg.png"
          alt="McLarens Group"
          fill
          className="object-cover"
          priority
        />
        {/* Bottom Left Logo */}
        <div className="absolute bottom-8 left-8 z-10">
          <Image
            src="/jubilee-logo-lock-up.svg"
            alt="McLarens Group 75 Years"
            width={150}
            height={50}
          />
        </div>
        {/* Copyright - Centered */}
        <div className="absolute bottom-8 left-0 right-0 text-center z-10">
          <p className="text-white text-[13px] tracking-wide">
            All Rights Reserved by © 2025 McLarens Group
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[48%] flex flex-col min-h-screen bg-white">
        {/* Top Right Logo */}
        <div className="flex justify-end pt-6 pr-8 lg:pt-8 lg:pr-12">
          <Image
            src="/jubilee-logo-lock-up.svg"
            alt="McLarens Group 75 Years"
            width={120}
            height={42}
          />
        </div>

        {/* Form Container - Vertically Centered */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-20">
          <div className="w-full max-w-[340px]">
            {/* Header */}
            <div className="mb-8">
              <p className="text-gray-500 text-[15px]">{subtitle}</p>
              <h1 className="text-[26px] font-semibold text-gray-900 mt-1">
                {title}
              </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="mb-5">
                <label className="block text-[13px] font-medium text-gray-600 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@mclarens.com"
                  className="w-full h-[46px] px-4 text-[14px] text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-400"
                  required={!!onSubmit}
                />
              </div>

              {/* Password */}
              <div className="mb-5">
                <label className="block text-[13px] font-medium text-gray-600 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[46px] px-4 text-[14px] text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-400"
                  required={!!onSubmit}
                />
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded-full border-gray-300 text-gray-400 focus:ring-0"
                  />
                  <span className="text-[13px] text-gray-500">Remember me</span>
                </label>
                <button type="button" className="text-[13px] text-emerald-500 hover:text-emerald-600">
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-[13px] text-red-600">{error}</p>
                </div>
              )}

              {/* Login Button - Green (only if onSubmit provided) */}
              {onSubmit && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[46px] bg-[#22c55e] text-white text-[15px] font-medium rounded-md hover:bg-[#16a34a] transition-colors disabled:opacity-50 mb-4"
                >
                  {loading ? "Signing in..." : "Login now"}
                </button>
              )}

              {/* Microsoft Login - Dark Gray */}
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={microsoftLoading}
                className="w-full h-[46px] bg-[#3f3f46] text-white text-[14px] font-medium rounded-md hover:bg-[#27272a] transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <MicrosoftIcon />
                <span>{microsoftLoading ? "Redirecting..." : "Sign in with Microsoft"}</span>
              </button>
            </form>

            {/* Create Account Link */}
            {alternateLoginText && alternateLoginHref && (
              <p className="mt-10 text-center text-[13px] text-gray-500">
                {alternateLoginText}{" "}
                <Link href={alternateLoginHref} className="text-emerald-500 hover:text-emerald-600">
                  Create new account
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
