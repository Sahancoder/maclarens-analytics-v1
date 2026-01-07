"use client";

import Image from "next/image";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const partners = [
  { name: "MMA", src: "/Company Logos/mma-logo-320.png" },
  { name: "MOL", src: "/Company Logos/mol-logo.jpg" },
  { name: "C.H. Robinson", src: "/Company Logos/Robinson_Logo.png" },
  { name: "Swift Shipping", src: "/Company Logos/Shipping .png" },
  { name: "Sharmans", src: "/Company Logos/Sharmans  logistic..png" },
  { name: "GAC", src: "/Company Logos/gac-logo.svg" },
];

interface PartnerLogosProps {
  showLabel?: boolean;
}

export function PartnerLogos({ showLabel = true }: PartnerLogosProps) {
  const allLogos = [...partners, ...partners, ...partners];
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });

  return (
    <section
      ref={ref}
      className={`border-y border-slate-200 bg-slate-50 py-6 md:py-8 overflow-hidden transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      {showLabel && (
        <p className="mb-4 md:mb-6 text-center text-xs md:text-sm font-medium uppercase tracking-wider text-slate-500">
          Trusted by leading organizations
        </p>
      )}

      <div className="relative">
        <div className="flex animate-scroll gap-12 md:gap-20">
          {allLogos.map((partner, index) => (
            <div
              key={`${partner.name}-${index}`}
              className="flex h-16 w-36 md:h-20 md:w-48 flex-shrink-0 items-center justify-center"
            >
              <Image
                src={partner.src}
                alt={partner.name}
                width={180}
                height={70}
                className="h-14 md:h-16 w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
