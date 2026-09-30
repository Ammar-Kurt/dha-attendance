import { createFileRoute } from "@tanstack/react-router";
import { AuditLogPage } from "@/components/dha-app";

export const Route = createFileRoute("/audit-log")({
  head: () => ({ meta: [
    { title: "Audit Log — DHA Attendance" },
    { name: "description", content: "Track every change made in the attendance system." },
    { property: "og:title", content: "Audit Log — DHA Attendance" },
    { property: "og:description", content: "Track every change made in the attendance system." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AuditLogPage,
});
