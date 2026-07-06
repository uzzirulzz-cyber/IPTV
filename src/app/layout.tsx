import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Playbeat Digital — Live IPTV Streaming",
  description:
    "Playbeat Digital brings you a premium live TV experience with hundreds of channels across news, sports, entertainment, and more — all in stunning quality with rock-solid stability.",
  keywords: [
    "Playbeat",
    "IPTV",
    "live TV",
    "streaming",
    "live channels",
    "media player",
  ],
  authors: [{ name: "Playbeat Digital" }],
  openGraph: {
    title: "Playbeat Digital — Live IPTV Streaming",
    description:
      "Premium live TV experience with hundreds of channels in stunning quality.",
    siteName: "Playbeat Digital",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Playbeat Digital",
    description: "Live IPTV streaming — premium quality, rock-solid stability.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}
