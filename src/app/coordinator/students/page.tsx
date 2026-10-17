"use client";

import StudentsTable from "@/components/dashboard/StudentsTable";

export default function CoordinatorStudentsPage() {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Assigned Students Roster</h1>
        <p className="text-sm text-slate-500 mt-1">
          Final year student records assigned to your faculty coordination cohort.
        </p>
      </div>
      <StudentsTable />
    </div>
  );
}
