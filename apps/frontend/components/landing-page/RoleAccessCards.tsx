"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface RoleCard {
  title: string;
  description: string;
  href: string;
  icon: string;
}

const roles: RoleCard[] = [
  {
    title: "Finance Officer",
    description: "Enter actual & budget financial data",
    href: "/finance-officer/login",
    icon: "/Data_entry.png",
  },
  {
    title: "Finance Director",
    description: "Review reports and submit to MD",
    href: "/finance-director/login",
    icon: "/Data_validation.png",
  },
  {
    title: "System Administrator",
    description: "Manage users and configurations",
    href: "/system-admin/login",
    icon: "/System_administrator.png",
  },
  {
    title: "MD's Dashboard",
    description: "View group-wide analytics",
    href: "/md/login",
    icon: "/Analytics.png",
  },
];

export function RoleAccessCards() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollAnimation();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation({
    threshold: 0.2,
  });

  return (
    <section className="bg-white py-12 md:py-20">
      <div className="w-full px-4 md:px-8 lg:px-16">
        <div
          ref={titleRef}
          className={`mb-8 md:mb-14 transition-all duration-700 ${
            titleVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="font-sansation text-3xl md:text-4xl lg:text-5xl font-bold tracking-wide text-[#0b1f3a]">
            McLarens Analytics.io
          </h2>
          <p className="mt-2 md:mt-4 text-base md:text-lg lg:text-xl text-slate-600 max-w-3xl">
            Select your role to access your personalized dashboard and begin
            managing financial data across the McLarens Group.
          </p>
        </div>

        <div
          ref={cardsRef}
          className={`grid grid-cols-2 gap-4 md:gap-8 lg:grid-cols-4 transition-all duration-700 delay-200 ${
            cardsVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          {roles.map((role) => (
            <Link key={role.title} href={role.href} className="group">
              <div className="relative flex h-48 md:h-72 lg:h-80 flex-col items-center justify-center rounded-xl md:rounded-2xl bg-[#0b1f3a] p-4 md:p-8 text-white shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-1">
                <div className="flex h-16 w-16 md:h-24 lg:h-28 md:w-24 lg:w-28 items-center justify-center">
                  <Image
                    src={role.icon}
                    alt={role.title}
                    width={112}
                    height={112}
                    className="h-14 md:h-20 lg:h-24 w-auto object-contain brightness-0 invert"
                  />
                </div>

                <h3 className="mt-3 md:mt-6 text-center font-roboto text-sm md:text-xl lg:text-2xl font-semibold text-white">
                  {role.title}
                </h3>

                <p className="hidden md:block mt-2 md:mt-3 text-center text-sm md:text-base text-white/70">
                  {role.description}
                </p>

                <div className="hidden md:flex mt-4 md:mt-5 items-center gap-2 text-sm md:text-base font-medium text-amber-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span>Enter</span>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
