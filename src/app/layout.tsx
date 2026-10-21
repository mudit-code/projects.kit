import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { PageLoadingProvider } from "@/components/PageLoadingProvider";
import { SessionInactivityWatcher } from "@/components/SessionInactivityWatcher";
import { PwaManager } from "@/components/mobile/pwa/PwaManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F5F2" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1120" },
  ],
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "projects.kit",
  description: "Academic Project Lifecycle & Evaluation Portal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "projects.kit",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-touch-fullscreen": "yes",
  },
  icons: {
    icon: [
      {
        url: "/favicon-light.svg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-dark.svg",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/favicon.svg",
      },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link
          rel="icon"
          type="image/svg+xml"
          href="/favicon-light.svg"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/favicon-dark.svg"
          media="(prefers-color-scheme: dark)"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Suspense fallback={null}>
          <PageLoadingProvider>
            <PwaManager />
            <SessionInactivityWatcher />
            {children}
          </PageLoadingProvider>
        </Suspense>
      </body>
    </html>
  );
}

