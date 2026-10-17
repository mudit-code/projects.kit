"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getActiveSession, UserSession } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(() => getActiveSession());
  const [isMounted, setIsMounted] = useState(false);

  // Hook 1: Synchronize session across windows and storage
  useEffect(() => {
    setIsMounted(true);
    const syncSession = () => {
      setSession(getActiveSession());
    };
    syncSession();

    window.addEventListener("kit-auth-change", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("kit-auth-change", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  // Hook 2: Forward legacy root dashboard routes (/forms, /projects, /students, /roles) to their dedicated secure role paths
  // MUST be declared before any conditional return statements!
  useEffect(() => {
    if (!isMounted || pathname === "/") return;

    if (!session) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (session.role === "HOD") {
      router.replace(`/hod${pathname}`);
    } else {
      if (pathname.startsWith("/roles") || pathname.startsWith("/projects/new")) {
        router.replace("/coordinator?restricted=hod_only");
      } else {
        router.replace(`/coordinator${pathname}`);
      }
    }
  }, [isMounted, pathname, session, router]);

  // Root path `/` (localhost:3000) is EXCLUSIVELY the Public Landing Page — never wrap with dashboard layout
  if (pathname === "/") {
    return <>{children}</>;
  }

  if (isMounted) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
          <p className="text-xs font-bold text-slate-600">Routing to dedicated secure role portal...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
