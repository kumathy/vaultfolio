import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Vaultfolio", template: "%s · Vaultfolio" },
  description:
    "Monthly investing reports from SnapTrade brokerage data, written as Markdown for an Obsidian vault.",
};

export const viewport: Viewport = {
  themeColor: "#181a19",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
