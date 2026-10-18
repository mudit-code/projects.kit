import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { PageLoadingProvider } from "@/components/PageLoadingProvider";

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
    icon: "data:,",
    shortcut: "data:,",
    apple: "data:,",
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
        <link rel="icon" href="data:," />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Suspense fallback={null}>
          <PageLoadingProvider>
            {children}
          </PageLoadingProvider>
        </Suspense>
      </body>
    </html>
  );
}

