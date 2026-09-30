import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "@/components/dha-app";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [
    { title: "Users & Roles — DHA Attendance" },
    { name: "description", content: "Manage system users and role permissions." },
    { property: "og:title", content: "Users & Roles — DHA Attendance" },
    { property: "og:description", content: "Manage system users and role permissions." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: UsersPage,
});
