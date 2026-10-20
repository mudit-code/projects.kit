import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPortalPageClient } from "@/components/AdminPortalPageClient";

export const metadata: Metadata = {
  title: "Hidden Admin Panel | Staff & Admin Gate | projects.kit",
  description:
    "Institutional sign-in gate for Head of Department (HOD) and Faculty Project Coordinators at Kanpur Institute of Technology.",
};

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F5F2] flex items-center justify-center p-4">
          <div className="text-xs font-semibold text-slate-500">Loading admin portal...</div>
        </div>
      }
    >
      <AdminPortalPageClient />
    </Suspense>
  );
}
