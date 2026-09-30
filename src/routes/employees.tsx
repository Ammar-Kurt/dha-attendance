import { createFileRoute } from "@tanstack/react-router";
import { EmployeesPage } from "@/components/dha-app";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [
    { title: "Employees — DHA Attendance" },
    { name: "description", content: "Manage the DHA Company employee directory." },
    { property: "og:title", content: "Employees — DHA Attendance" },
    { property: "og:description", content: "Manage the DHA Company employee directory." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: EmployeesPage,
});
