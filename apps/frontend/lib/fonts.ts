import { Inter, Roboto, Poppins } from "next/font/google";

/**
 * Inter – Default UI font (forms, tables, dashboards)
 */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Roboto – Headings / Analytics / Numbers
 */
export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

/**
 * Poppins – Branding / Hero text (alternative to Sansation)
 * Replace with local Sansation font when available
 */
export const sansation = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sansation",
  display: "swap",
});
