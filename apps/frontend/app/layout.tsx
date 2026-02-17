import "../styles/globals.css";
import type { Metadata } from "next";
import { inter, roboto, sansation } from "@/lib/fonts";
import { NextAuthProvider } from "@/lib/auth-provider";
import { AuthProvider } from "@/lib/auth-context";
import { ApolloWrapper } from "@/lib/apollo-wrapper";

export const metadata: Metadata = {
  title: "McLarens Analytics.io | Enterprise Financial Analytics",
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
          <ApolloWrapper>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ApolloWrapper>
        </NextAuthProvider>
      </body>
    </html>
  );
}
