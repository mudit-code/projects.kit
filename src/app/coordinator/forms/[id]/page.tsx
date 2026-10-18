"use client";

import { use } from "react";
import { FormStudentTrackerView } from "@/components/dashboard/FormStudentTrackerView";

export default function CoordinatorFormTrackerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  return (
    <FormStudentTrackerView
      formId={resolvedParams.id}
      backHref="/coordinator/forms"
    />
  );
}
