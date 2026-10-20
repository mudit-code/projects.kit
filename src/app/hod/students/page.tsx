"use client";

import StudentsTable from "@/components/dashboard/StudentsTable";

export default function HodStudentsPage() {
  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      <div className="mb-2.5 shrink-0">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Students Directory</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Final year students directory &bull; B.Tech 2023-27 batch (HOD Departmental Oversight)
        </p>
      </div>
      <StudentsTable />
    </div>
  );
}
