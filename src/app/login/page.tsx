"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPageClient } from "@/components/LoginPageClient";
import { getActiveSession, isRouteAllowedForRole, RoleType, getRoleHomeRoute } from "@/lib/auth";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "";

  useEffect(() => {
    // If already logged in, navigate straight to role home or valid requested target
    const session = getActiveSession();
    if (session) {
      if (redirectTarget && redirectTarget !== "/" && isRouteAllowedForRole(redirectTarget, session.role)) {
        router.push(redirectTarget);
      } else {
        router.push(getRoleHomeRoute(session.role));
      }
    }
  }, [router, redirectTarget]);

  const handleLoginSuccess = (role: RoleType) => {
    if (redirectTarget && redirectTarget !== "/" && isRouteAllowedForRole(redirectTarget, role)) {
      router.push(redirectTarget);
    } else {
      router.push(getRoleHomeRoute(role));
    }
  };

  return (
    <LoginPageClient
      onLoginSuccess={handleLoginSuccess}
      onBackToPublic={() => router.push("/")}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F5F2] flex items-center justify-center">
          <div className="text-xs font-bold text-slate-500">Loading sign-in portal...</div>
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
