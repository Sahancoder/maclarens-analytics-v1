"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface FeatureItem {
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    title: "Financial Performance Analysis",
    description:
      "Provides real-time visibility into actual financial performance across companies, clusters, and the group, enabling comparison of monthly and yearly results against approved budgets and historical trends.",
  },
  {
    title: "Budgeting & Compliance Management",
    description:
      "Ensures structured budget planning, controlled approvals, and audit-ready workflows by enforcing role-based data entry, review, rejection, and approval processes in line with corporate governance standards.",
  },
  {
    title: "Multi-Level Granularity",
    description:
      "Delivers financial insights at multiple organizational levels company, cluster, and group allowing users to drill down from high level summaries to detailed company-specific performance data.",
  },
  {
    title: "Strategic Decision Support",
    description:
      "Empowers senior management with actionable insights through variance analysis, achievement metrics, and performance rankings, supporting informed strategic decisions across time periods and business units.",
  },
];

function AccordionItem({
  feature,
  isOpen,
  onToggle,
}: {
  feature: FeatureItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [showTick, setShowTick] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const tickTimer = setTimeout(() => setShowTick(true), 600);
      return () => clearTimeout(tickTimer);
    } else {
      setShowTick(false);
    }
  }, [isOpen]);

  return (
    <div className="border-b border-white/20 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-6 md:py-8 text-left"
      >
        <span className="font-roboto text-xl md:text-2xl lg:text-3xl font-medium text-white pr-4">
          {feature.title}
        </span>
        <div
          className={`flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-full bg-white/10 transition-all duration-300 flex-shrink-0 ${
            isOpen ? "bg-amber-400 rotate-180" : ""
          }`}
        >
          <ChevronDown
            className={`h-5 w-5 md:h-7 md:w-7 transition-colors ${
              isOpen ? "text-[#0b1f3a]" : "text-white"
            }`}
          />
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${
          isOpen ? "max-h-[500px] opacity-100 pb-8 md:pb-10" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pl-0 md:pl-4">
          <p
            className={`text-lg md:text-xl lg:text-2xl leading-relaxed text-white/80 transition-all duration-500 delay-100 ${
              isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {feature.description}
          </p>

          <div
            className={`mt-6 md:mt-8 flex items-center gap-3 transition-all duration-500 ${
              showTick
                ? "translate-y-0 opacity-100 scale-100"
                : "translate-y-3 opacity-0 scale-90"
            }`}
          >
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-green-500">
              <Check className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-base md:text-lg lg:text-xl font-medium text-green-400">
              Available in your dashboard
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { ref: titleRef, isVisible: titleVisible } = useScrollAnimation();
  const { ref: leftRef, isVisible: leftVisible } = useScrollAnimation({
    threshold: 0.15,
  });
  const { ref: rightRef, isVisible: rightVisible } = useScrollAnimation({
    threshold: 0.15,
  });

  const leftFeatures = features.slice(0, 2);
  const rightFeatures = features.slice(2, 4);

  return (
    <section className="bg-[#0b1f3a] py-16 md:py-24 lg:py-32">
      <div className="w-full px-4 md:px-8 lg:px-16">
        <div
          ref={titleRef}
          className={`mb-10 md:mb-16 transition-all duration-700 ${
            titleVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="font-sansation text-3xl md:text-4xl lg:text-5xl font-bold text-white">
            Platform Capabilities
          </h2>
          <p className="mt-3 md:mt-5 text-lg md:text-xl lg:text-2xl text-white/70">
            Click to explore what McLarens Analytics.io offers
          </p>
        </div>

        <div className="grid gap-8 md:gap-12 lg:gap-20 md:grid-cols-2">
          <div
            ref={leftRef}
            className={`transition-all duration-700 delay-200 ${
              leftVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-10"
            }`}
          >
            {leftFeatures.map((feature, index) => (
              <AccordionItem
                key={feature.title}
                feature={feature}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
          <div
            ref={rightRef}
            className={`transition-all duration-700 delay-300 ${
              rightVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-10"
            }`}
          >
            {rightFeatures.map((feature, index) => (
              <AccordionItem
                key={feature.title}
                feature={feature}
                isOpen={openIndex === index + 2}
                onToggle={() => setOpenIndex(openIndex === index + 2 ? null : index + 2)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
