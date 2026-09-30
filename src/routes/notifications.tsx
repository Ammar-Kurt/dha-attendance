import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/dha-app";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [
    { title: "Notifications — DHA Attendance" },
    { name: "description", content: "Attendance and leave updates for your account." },
    { property: "og:title", content: "Notifications — DHA Attendance" },
    { property: "og:description", content: "Attendance and leave updates for your account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: NotificationsPage,
});
