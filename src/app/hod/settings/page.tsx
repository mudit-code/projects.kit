"use client";

import { Suspense } from "react";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { KitScreenLoader } from "@/components/KitScreenLoader";

export default function HodSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 flex items-center justify-center">
          <KitScreenLoader fullScreen={false} showText={false} />
        </div>
      }
    >
      <SettingsView role="HOD" />
    </Suspense>
  );
}
