import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

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
    url: "http://localhost:3000",
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
      <body className="antialiased bg-background text-foreground">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
