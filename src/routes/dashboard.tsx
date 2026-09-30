import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/dha-app";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — DHA Attendance" },
    { name: "description", content: "Today's attendance overview, leave balance and team highlights." },
    { property: "og:title", content: "Dashboard — DHA Attendance" },
    { property: "og:description", content: "Today's attendance overview, leave balance and team highlights." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: DashboardPage,
});
