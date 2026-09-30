import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/dha-app";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "My Profile — DHA Attendance" },
    { name: "description", content: "View your personal and employment details." },
    { property: "og:title", content: "My Profile — DHA Attendance" },
    { property: "og:description", content: "View your personal and employment details." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProfilePage,
});
