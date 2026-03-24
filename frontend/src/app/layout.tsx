import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/assignment/shared/AppShell";
import { AuthBootstrap } from "@/components/auth/AuthBootstrap";
import { RouteGuard } from "@/components/auth/RouteGuard";
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
  title: "Veda AI Assignment Creator",
  description: "Create and review AI-generated assignment papers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AuthBootstrap />
        <RouteGuard>
          <AppShell>{children}</AppShell>
        </RouteGuard>
      </body>
    </html>
  );
}
