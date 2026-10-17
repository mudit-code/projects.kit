import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register — projects.kit",
  description:
    "Enter your AFN to view available project forms, register your project, and manage your team on projects.kit.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
