import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/pages/profile";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — DHA Attendance" },
      { name: "description", content: "View and edit your personal and employment details." },
      { property: "og:title", content: "My Profile — DHA Attendance" },
      {
        property: "og:description",
        content: "View and edit your personal and employment details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected>
      <ProfilePage />
    </Protected>
  ),
});
