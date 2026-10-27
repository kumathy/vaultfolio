import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Vaultfolio", template: "%s · Vaultfolio" },
  description:
    "Structured investing reports from SnapTrade brokerage data, in the browser and in Obsidian.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col animate-page-in motion-reduce:animate-none">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
