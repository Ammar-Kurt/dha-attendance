import { createFileRoute } from "@tanstack/react-router";
import { OrganizationPage } from "@/components/pages/admin";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Departments & Shifts — DHA Attendance" },
      { name: "description", content: "Configure departments and work shifts." },
      { property: "og:title", content: "Departments & Shifts — DHA Attendance" },
      { property: "og:description", content: "Configure departments and work shifts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected roles={["hr_admin", "system_admin"]}>
      <OrganizationPage />
    </Protected>
  ),
});
