import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { PageLoadingProvider } from "@/components/PageLoadingProvider";
import { SessionInactivityWatcher } from "@/components/SessionInactivityWatcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "projects.kit",
  description: "Next-generation college project lifecycle management: project registrations, guide allocations, sprint milestones, rubric evaluations, and certified dossiers.",
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
            <SessionInactivityWatcher />
            {children}
          </PageLoadingProvider>
        </Suspense>
      </body>
    </html>
  );
}

