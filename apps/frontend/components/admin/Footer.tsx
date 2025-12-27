"use client";

import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[#0b1f3a] text-white py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/jubilee-logo-lock-up.svg"
            alt="McLarens Group"
            width={160}
            height={50}
            className="h-12 w-auto"
          />
          <div className="text-center text-sm text-white/70">
            <p>McLarens Group #284, Vauxhall Street, Colombo 02, Sri Lanka.</p>
            <p className="mt-2">+94 11 479 9100 &nbsp;&nbsp; info@mclarens.lk</p>
          </div>
          <div className="border-t border-white/20 w-full pt-6 mt-2">
            <p className="text-center text-sm text-white/50">
              All Rights Reserved by © 2025 McLarens Group
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
