import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/pages/notifications";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — DHA Attendance" },
      { name: "description", content: "Updates about your requests and attendance." },
      { property: "og:title", content: "Notifications — DHA Attendance" },
      { property: "og:description", content: "Updates about your requests and attendance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected>
      <NotificationsPage />
    </Protected>
  ),
});
