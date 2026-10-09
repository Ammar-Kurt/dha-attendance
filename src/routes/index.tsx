import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/pages/landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Welcome — DHA Attendance" },
      {
        name: "description",
        content: "Employee attendance and leave management for DHA Company, powered by Supabase.",
      },
      { property: "og:title", content: "Welcome — DHA Attendance" },
      {
        property: "og:description",
        content: "Employee attendance and leave management for DHA Company, powered by Supabase.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});
