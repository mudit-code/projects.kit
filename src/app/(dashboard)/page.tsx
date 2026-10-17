"use client";

import { useRouter } from "next/navigation";
import { PublicLandingPage } from "@/components/PublicLandingPage";

export default function HomePage() {
  const router = useRouter();

  return (
    <PublicLandingPage
      onAdminAccess={() => {
        router.push("/login");
      }}
    />
  );
}
