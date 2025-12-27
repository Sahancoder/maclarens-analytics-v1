import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="bg-[#0b1f3a] py-12 md:py-20 lg:py-24 text-white">
      <div className="w-full px-4 md:px-8 lg:px-16">
        <div className="mb-10 md:mb-16 h-px bg-white/20" />

        <div className="flex flex-col items-center gap-6 md:gap-10 text-center">
          <Image
            src="/75-years-footer-logo.svg"
            alt="McLarens Group 75 Years"
            width={320}
            height={100}
            className="h-20 md:h-28 lg:h-32 w-auto"
          />

          <p className="text-base md:text-xl lg:text-2xl text-white/80 max-w-2xl">
            McLarens Group #284, Vauxhall Street, Colombo 02, Sri Lanka.
          </p>

          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-8 text-base md:text-xl lg:text-2xl text-white/80">
            <span>+94 11 479 9100</span>
            <span className="hidden md:block h-1.5 w-1.5 rounded-full bg-white/40" />
            <a href="mailto:info@mclarens.lk">info@mclarens.lk</a>
          </div>

          <p className="mt-6 md:mt-10 text-sm md:text-lg lg:text-xl text-white/50">
            All Rights Reserved © 2025 McLarens Group
          </p>
        </div>
      </div>
    </footer>
  );
}
