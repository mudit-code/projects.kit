"use client";

import { use } from "react";
import { FormStudentTrackerView } from "@/components/dashboard/FormStudentTrackerView";

export default function HodFormTrackerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  return (
    <FormStudentTrackerView
      formId={resolvedParams.id}
      backHref="/hod/forms"
    />
  );
}
