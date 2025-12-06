import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PatentFlow Enterprise - Premium Patent Drafting Platform",
  description: "Professional patent drafting and analysis platform with Word integration, AI-powered analysis, and enterprise collaboration features.",
  keywords: ["PatentFlow", "Patent Drafting", "Patent Analysis", "Word Integration", "AI", "Enterprise"],
  authors: [{ name: "PatentFlow Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "PatentFlow Enterprise",
    description: "Premium patent drafting and analysis platform",
    url: "https://patentflow.com",
    siteName: "PatentFlow Enterprise",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
