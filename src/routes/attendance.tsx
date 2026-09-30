import { createFileRoute } from "@tanstack/react-router";
import { AttendancePage } from "@/components/dha-app";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [
    { title: "My Attendance — DHA Attendance" },
    { name: "description", content: "Clock in, clock out and review your monthly attendance history." },
    { property: "og:title", content: "My Attendance — DHA Attendance" },
    { property: "og:description", content: "Clock in, clock out and review your monthly attendance history." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AttendancePage,
});
