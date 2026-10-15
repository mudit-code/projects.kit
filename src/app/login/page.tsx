"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginPageClient } from "@/components/LoginPageClient";
import { getActiveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // If already logged in, go straight to dashboard
    const session = getActiveSession();
    if (session) {
      router.push("/");
    }
  }, [router]);

  return (
    <LoginPageClient
      onLoginSuccess={() => {
        router.push("/");
      }}
    />
  );
}
