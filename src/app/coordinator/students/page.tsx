"use client";

import StudentsTable from "@/components/dashboard/StudentsTable";

export default function CoordinatorStudentsPage() {
  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      <div className="mb-2.5 shrink-0">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Assigned Students Roster</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Final year student records assigned to your faculty coordination.
        </p>
      </div>
      <StudentsTable />
    </div>
  );
}
