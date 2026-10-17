"use client";

import { useRouter } from "next/navigation";
import { PublicLandingPage } from "@/components/PublicLandingPage";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <PublicLandingPage
      onAdminAccess={() => {
        router.push("/login");
      }}
    />
  );
}
