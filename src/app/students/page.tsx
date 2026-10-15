"use client";

import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";
import StudentsTable from "@/components/dashboard/StudentsTable";

export default function StudentsPage() {
  return (
    <DashboardLayoutClient>
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500 mt-1">
            Final year students directory · B.Tech 2023-27 batch
          </p>
        </div>
        <StudentsTable />
      </div>
    </DashboardLayoutClient>
  );
}
