import { createFileRoute } from "@tanstack/react-router";
import { TeamAttendancePage } from "@/components/dha-app";

export const Route = createFileRoute("/team-attendance")({
  head: () => ({ meta: [
    { title: "Team Attendance — DHA Attendance" },
    { name: "description", content: "Monitor your team's daily attendance and punctuality." },
    { property: "og:title", content: "Team Attendance — DHA Attendance" },
    { property: "og:description", content: "Monitor your team's daily attendance and punctuality." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TeamAttendancePage,
});
