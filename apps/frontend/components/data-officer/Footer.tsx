import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[#0b1f3a] text-white py-6 w-full">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Image
            src="/jubilee-logo-lock-up.svg"
            alt="McLarens Group 75 Years"
            width={140}
            height={45}
            className="h-10 w-auto"
          />
          <p className="text-white/70 text-sm hidden md:block">
            McLarens Group #284, Vauxhall Street, Colombo 02, Sri Lanka.
          </p>
        </div>
        
        <div className="flex items-center gap-6 text-white/70 text-sm">
          <span>+94 11 479 9100</span>
          <span>info@mclarens.lk</span>
          <span className="hidden md:inline">© 2025 McLarens Group</span>
        </div>
      </div>
    </footer>
  );
}
