"use client";

import { useEffect, useState } from "react";
import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";
import { LoginPageClient } from "@/components/LoginPageClient";
import { getActiveSession, UserSession } from "@/lib/auth";
import { KitScreenLoader } from "@/components/KitScreenLoader";

export default function HomePage() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const current = getActiveSession();
    setSession(current);
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F6F5F2]">
        <KitScreenLoader showText={false} loop={true} transparent={true} />
      </div>
    );
  }

  // If no user is logged in, show the Login Page at localhost:3000
  if (!session) {
    return (
      <LoginPageClient
        onLoginSuccess={() => {
          const updated = getActiveSession();
          setSession(updated);
        }}
      />
    );
  }

  // Once authenticated, open the dashboard of the selected role
  return (
    <DashboardLayoutClient initialRole={session.role}>
      <div className="w-full min-h-[400px]">
        {/* Dashboard workspace ready for role-specific layouts */}
      </div>
    </DashboardLayoutClient>
  );
}
