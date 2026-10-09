import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "@/components/pages/admin";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles — DHA Attendance" },
      { name: "description", content: "Assign roles to user accounts." },
      { property: "og:title", content: "Users & Roles — DHA Attendance" },
      { property: "og:description", content: "Assign roles to user accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected roles={["system_admin"]}>
      <UsersPage />
    </Protected>
  ),
});
