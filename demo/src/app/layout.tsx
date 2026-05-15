import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lighthouse — daily research briefs, your way",
  description:
    "Stop drowning in tabs. Pick a topic, bring your own AI key, and Lighthouse drafts a short daily brief in your inbox, Slack, Discord or Notion.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/branding/logo-icon-clean.png", type: "image/png" },
    ],
    apple: { url: "/branding/logo-icon-clean.png", type: "image/png" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
