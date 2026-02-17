"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowRight, ExternalLink, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

interface LoginScreenProps {
  role?: string;
}

const LoginScreen = ({ role }: LoginScreenProps = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Background images
  const backgroundImages = [
    {
      src: "/Login logos/login background 2.jpg",
      alt: "McLarens Operations",
      label: "Global Reach",
      description:
        "Empowering decisions with real-time financial intelligence across all clusters.",
    },
    {
      src: "/Login logos/login-bg.png",
      alt: "Maritime Excellence",
      label: "Operational Excellence",
      description:
        "Trusted insights for directors, officers, and decision-makers worldwide.",
    },
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  // Typewriting effect for heading
  useEffect(() => {
    const currentLabel = backgroundImages[currentImageIndex].label;
    
    if (currentCharIndex < currentLabel.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(currentLabel.slice(0, currentCharIndex + 1));
        setCurrentCharIndex(currentCharIndex + 1);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [currentCharIndex, currentImageIndex, backgroundImages]);

  // Auto-switch background every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === backgroundImages.length - 1 ? 0 : prevIndex + 1
      );
      setDisplayedText("");
      setCurrentCharIndex(0);
    }, 5000);
    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  // Handle Microsoft SSO Login
  // Every user MUST authenticate via Microsoft Entra ID.
  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setAuthError(null);

    // The 'role' prop tells us which portal login page the user is on.
    const portal = role || "";

    // Store the portal in localStorage so the callback page knows
    // which portal the user came from and can verify access.
    if (portal) {
      localStorage.setItem("mclarens_login_portal", portal);
    }

    // Always use Microsoft Entra ID for authentication.
    signIn("azure-ad", {
      callbackUrl: `/auth/callback?portal=${encodeURIComponent(portal)}`,
    });
  };

  const error = searchParams.get("error");
  const displayError = authError || error;

  // Navigate back to landing page
  const handleBackToHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900 relative">
      {/* Back to Landing Page Button */}
      <button
        onClick={handleBackToHome}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40 group"
        aria-label="Back to home"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Home</span>
      </button>

      {/* LEFT SIDE: Image Slider (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        {backgroundImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Image Layer */}
            <div className="absolute inset-0">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                priority={index === 0}
                className={`object-cover transition-transform duration-[100ms] ${
                  index === currentImageIndex ? "scale-105" : "scale-105"
                }`}
                sizes="50vw"
              />
            </div>

            {/* Blue Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-blue-900/60 to-blue-800/30" />

            {/* Caption Text */}
            <div className="absolute bottom-12 left-12 text-white max-w-2xl animate-fade-in-up">
              <p className="text-white font-semibold tracking-wider text-lg uppercase mb-4">
                McLarens Analytics
              </p>
              <h2 className="text-6xl font-bold leading-tight mb-6 text-white typewriter">
                {displayedText}
                <span className="animate-blink">|</span>
              </h2>
              <p className="text-white text-2xl font-light leading-relaxed">
                {img.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50/50">
        <div className="w-full max-w-md space-y-8 p-10 animate-fade-in">
          {/* Header & Logo */}
          <div className="text-center">
            <div className="mx-auto h-20 w-auto flex items-center justify-center mb-6 relative">
              <Image
                src="/blue-75-years-logo.svg"
                alt="McLarens Analytics"
                width={200}
                height={80}
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome to McLarens Analytics
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Please sign in to access your dashboard
            </p>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-600 mt-0.5">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800">
                    Authentication Error
                  </h3>
                  <p className="mt-1 text-xs text-red-700">
                    {authError
                      ? authError
                      : displayError === "Configuration"
                      ? "There is a problem with the server configuration."
                      : displayError === "AccessDenied"
                      ? "You do not have permission to sign in."
                      : displayError === "Verification"
                      ? "The sign-in link is no longer valid."
                      : "An error occurred during sign-in. Please try again."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Login Actions */}
          <div className="mt-8 space-y-6">
            {/* Microsoft SSO Button */}
            <button
              onClick={handleMicrosoftLogin}
              disabled={isLoading}
              className="w-full max-w-[280px] mx-auto flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-3 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:border-slate-400 group focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-slate-700"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-xs sm:text-sm">Signing in...</span>
                </>
              ) : (
                <>
                  {/* Microsoft Logo Icon */}
                  <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5 shrink-0">
                    <div className="bg-[#f25022] w-full h-full"></div>
                    <div className="bg-[#7fba00] w-full h-full"></div>
                    <div className="bg-[#00a4ef] w-full h-full"></div>
                    <div className="bg-[#ffb900] w-full h-full"></div>
                  </div>
                  <span className="text-xs sm:text-sm">
                    Sign in with Microsoft Entra ID
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-slate-50/50 px-2 text-slate-400">
                  Secure Access
                </span>
              </div>
            </div>

            {/* Info Box / Official Link */}
            <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-100">
              <p className="text-xs text-slate-500 mb-2">
                Access is restricted to authorized McLarens personnel
                (Directors, Officers, Admins).
              </p>
              <a
                href="https://www.mclarens.lk/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
              >
                Need help? Visit official website{" "}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div>© 2025 McLarens Group</div>
              <div className="flex gap-3">
                <a
                  href="https://www.mclarens.lk/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-slate-600 transition-colors"
                >
                  Terms
                </a>
                <a
                  href="https://www.mclarens.lk/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-slate-600 transition-colors"
                >
                  Privacy
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Styles for Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(0); // Fix initial opacity?
          }
          to {
            opacity: 1;
            // transform? 
          }
        }
        // ... (Keep existing styles mostly)
        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .animate-blink {
          animation: blink 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
