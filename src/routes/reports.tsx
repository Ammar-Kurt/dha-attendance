import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/components/pages/reports";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — DHA Attendance" },
      { name: "description", content: "Monthly attendance summaries with CSV export." },
      { property: "og:title", content: "Reports — DHA Attendance" },
      { property: "og:description", content: "Monthly attendance summaries with CSV export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected roles={["manager", "hr_admin", "system_admin"]}>
      <ReportsPage />
    </Protected>
  ),
});
