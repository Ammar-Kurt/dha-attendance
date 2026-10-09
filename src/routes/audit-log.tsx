import { createFileRoute } from "@tanstack/react-router";
import { AuditLogPage } from "@/components/pages/admin";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log — DHA Attendance" },
      { name: "description", content: "History of administrative changes and approvals." },
      { property: "og:title", content: "Audit Log — DHA Attendance" },
      { property: "og:description", content: "History of administrative changes and approvals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected roles={["hr_admin", "system_admin"]}>
      <AuditLogPage />
    </Protected>
  ),
});
