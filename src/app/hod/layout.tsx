"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";
import { getActiveSession, UserSession } from "@/lib/auth";
import { AccessDenied } from "@/components/AccessDenied";

export default function HodLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<UserSession | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setSession(getActiveSession());

    const syncSession = () => {
      setSession(getActiveSession());
    };

    window.addEventListener("kit-auth-change", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("kit-auth-change", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  // If client-mounted and unauthenticated, show redirect message
  if (isMounted && !session) {
    return (
      <DashboardLayoutClient initialRole="HOD">
        <div className="h-64 flex items-center justify-center">
          <p className="text-xs font-bold text-slate-600">Redirecting to institutional sign-in...</p>
        </div>
      </DashboardLayoutClient>
    );
  }

  // If client-mounted as COORDINATOR, deny access with 403 screen
  if (isMounted && session?.role !== "HOD") {
    return (
      <DashboardLayoutClient initialRole={session?.role}>
        <AccessDenied
          requiredRole="HOD"
          currentRole={session?.role || "COORDINATOR"}
          routeName="Head of Department (HOD) Portal"
        />
      </DashboardLayoutClient>
    );
  }

  // Always render children so Next.js Partial Prefetching / Instant Navigation can validate the segment
  return (
    <DashboardLayoutClient initialRole="HOD">
      {children}
    </DashboardLayoutClient>
  );
}
