"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

const heroImages = [
  "/Hero ship.jpg",
  "/Landing page 2 .jpg",
  "/Landing page 3 .jpg",
];

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-[70vh] min-h-[500px] max-h-[700px] md:h-[85vh] md:min-h-[600px] md:max-h-[800px] w-full overflow-hidden">
      {heroImages.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={src}
            alt="McLarens Analytics"
            fill
            sizes="100vw"
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-[#003459]/95 via-[#003459]/70 to-[#003459]/30 md:from-[#003459]/90 md:via-[#003459]/60 md:to-transparent" />

      <div className="absolute left-4 top-4 z-20 md:left-8 md:top-8 lg:left-12">
        <Image
          src="/jubilee-logo-lock-up.svg"
          alt="McLarens Group 75 Years"
          width={200}
          height={65}
          className="h-12 w-auto md:h-16"
        />
      </div>

      <div className="absolute inset-0 flex items-center">
        <div className="w-full px-4 md:px-8 lg:px-16">
          <div className="max-w-xl md:max-w-2xl">
            <div className="border-l-4 border-amber-400 pl-4 md:pl-8">
              <p className="text-base md:text-xl font-medium text-white/90">
                Welcome to
              </p>
              <h1 className="mt-1 md:mt-2 font-sansation text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-white md:whitespace-nowrap">
                McLarens Analytics.io
              </h1>
            </div>

            <p className="mt-4 md:mt-8 text-sm md:text-lg lg:text-xl leading-relaxed text-white/90">
              Track real-time financial metrics and operational KPIs to optimize
              business strategy and maximize profitability across the McLarens
              Group.
            </p>

            <div className="mt-4 md:mt-8 flex items-center gap-2 md:gap-3">
              <div className="h-2 w-2 md:h-3 md:w-3 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm md:text-base lg:text-lg font-medium text-white/80">
                Enterprise-grade analytics platform
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block absolute bottom-6 right-8 lg:right-12">
        <p className="font-sansation text-lg italic text-white/70">
          #Driven by Passion
        </p>
      </div>

      <div className="absolute bottom-4 md:bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? "w-6 md:w-8 bg-white" : "w-2 bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
