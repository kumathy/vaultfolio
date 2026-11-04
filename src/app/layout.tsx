import type { Metadata, Viewport } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Resolves the og:image path to an absolute URL, which link previews require.
  metadataBase: process.env.APP_BASE_URL
    ? new URL(process.env.APP_BASE_URL)
    : undefined,
  title: { default: "Vaultfolio", template: "%s | Vaultfolio" },
  description:
    "Monthly investing reports from SnapTrade brokerage data, written as Markdown for an Obsidian vault.",
  // Link previews (LinkedIn, Slack) read Open Graph tags and otherwise scrape page text.
  openGraph: {
    title: "Vaultfolio",
    description: "Monthly investing reports in Markdown, in Obsidian.",
    siteName: "Vaultfolio",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#181a19",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
