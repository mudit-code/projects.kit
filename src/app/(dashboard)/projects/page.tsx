"use client";

import { ProjectsTable } from "@/components/dashboard/ProjectsTable";

export default function ProjectsPage() {
  return (
    <div className="w-full flex-1 flex flex-col">
      <ProjectsTable />
    </div>
  );
}
