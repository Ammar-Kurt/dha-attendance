import { createFileRoute } from "@tanstack/react-router";
import { ApprovalsPage } from "@/components/pages/team";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — DHA Attendance" },
      { name: "description", content: "Review leave requests and attendance corrections." },
      { property: "og:title", content: "Approvals — DHA Attendance" },
      { property: "og:description", content: "Review leave requests and attendance corrections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected roles={["manager", "hr_admin", "system_admin"]}>
      <ApprovalsPage />
    </Protected>
  ),
});
