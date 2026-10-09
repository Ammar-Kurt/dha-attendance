import { createFileRoute } from "@tanstack/react-router";
import { AttendancePage } from "@/components/pages/attendance";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "My Attendance — DHA Attendance" },
      { name: "description", content: "Your attendance register, corrections and monthly totals." },
      { property: "og:title", content: "My Attendance — DHA Attendance" },
      {
        property: "og:description",
        content: "Your attendance register, corrections and monthly totals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected>
      <AttendancePage />
    </Protected>
  ),
});
