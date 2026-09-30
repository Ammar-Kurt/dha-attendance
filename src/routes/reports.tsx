import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/components/dha-app";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [
    { title: "Reports — DHA Attendance" },
    { name: "description", content: "Generate and export attendance and leave reports." },
    { property: "og:title", content: "Reports — DHA Attendance" },
    { property: "og:description", content: "Generate and export attendance and leave reports." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ReportsPage,
});
