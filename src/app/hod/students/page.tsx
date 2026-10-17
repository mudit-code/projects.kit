"use client";

import StudentsTable from "@/components/dashboard/StudentsTable";

export default function HodStudentsPage() {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Students Directory</h1>
        <p className="text-sm text-slate-500 mt-1">
          Final year students directory &bull; B.Tech 2023-27 batch (HOD Departmental Oversight)
        </p>
      </div>
      <StudentsTable />
    </div>
  );
}
