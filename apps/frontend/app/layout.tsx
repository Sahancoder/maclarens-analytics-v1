import "../styles/globals.css";
import type { Metadata } from "next";
import { inter, roboto, sansation } from "@/lib/fonts";
import { NextAuthProvider } from "@/lib/auth-provider";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "McLaren's Analytics.io | Enterprise Financial Analytics",
  description:
    "Track real-time financial metrics and operational KPIs to optimize strategy and maximize profitability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${roboto.variable} ${sansation.variable} font-inter antialiased`}
      >
        <NextAuthProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
