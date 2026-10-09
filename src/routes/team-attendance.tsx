import { createFileRoute } from "@tanstack/react-router";
import { TeamAttendancePage } from "@/components/pages/team";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/team-attendance")({
  head: () => ({
    meta: [
      { title: "Team Attendance — DHA Attendance" },
      { name: "description", content: "Live attendance register for your team." },
      { property: "og:title", content: "Team Attendance — DHA Attendance" },
      { property: "og:description", content: "Live attendance register for your team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected roles={["manager", "hr_admin", "system_admin"]}>
      <TeamAttendancePage />
    </Protected>
  ),
});
