import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ApolloAppProvider } from "@/lib/apollo/provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AgentFlow CRM",
    template: "%s | AgentFlow CRM",
  },
  description:
    "AI-powered CRM with workflow automation, integrations, analytics, and n8n sync.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo-icon.png",
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            <ApolloAppProvider>
              <TooltipProvider>
                <AuthProvider>
                  {children}
                  <Toaster />
                </AuthProvider>
              </TooltipProvider>
            </ApolloAppProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
