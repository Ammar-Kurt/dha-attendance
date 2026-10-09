import { createFileRoute } from "@tanstack/react-router";
import { LeaveHolidaysPage } from "@/components/pages/admin";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/leave-holidays")({
  head: () => ({
    meta: [
      { title: "Leave & Holidays — DHA Attendance" },
      { name: "description", content: "Configure leave types and public holidays." },
      { property: "og:title", content: "Leave & Holidays — DHA Attendance" },
      { property: "og:description", content: "Configure leave types and public holidays." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected roles={["hr_admin", "system_admin"]}>
      <LeaveHolidaysPage />
    </Protected>
  ),
});
