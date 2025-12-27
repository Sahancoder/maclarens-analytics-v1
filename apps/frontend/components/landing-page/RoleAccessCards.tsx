import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface RoleCard {
  title: string;
  description: string;
  href: string;
  icon: string;
}

const roles: RoleCard[] = [
  {
    title: "Budget Officer",
    description: "Enter and submit financial data",
    href: "/data-officer",
    icon: "/Data_entry.png",
  },
  {
    title: "Company Director",
    description: "Review and approve submissions",
    href: "/company-director",
    icon: "/Data_validation.png",
  },
  {
    title: "System Administrator",
    description: "Manage users and configurations",
    href: "/admin",
    icon: "/System_administrator.png",
  },
  {
    title: "Executive Dashboard",
    description: "View group-wide analytics",
    href: "/ceo",
    icon: "/Analytics.png",
  },
];

export function RoleAccessCards() {
  return (
    <section className="bg-white py-12 md:py-20">
      <div className="w-full px-4 md:px-8 lg:px-16">
        <div className="mb-8 md:mb-14">
          <h2 className="font-sansation text-3xl md:text-4xl lg:text-5xl font-bold tracking-wide text-[#0b1f3a]">
            McLaren&apos;s Analytics.io
          </h2>
          <p className="mt-2 md:mt-4 text-base md:text-lg lg:text-xl text-slate-600 max-w-3xl">
            Select your role to access your personalized dashboard and begin
            managing financial data across the McLarens Group.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-8 lg:grid-cols-4">
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
