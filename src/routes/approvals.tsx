import { createFileRoute } from "@tanstack/react-router";
import { ApprovalsPage } from "@/components/dha-app";

export const Route = createFileRoute("/approvals")({
  head: () => ({ meta: [
    { title: "Approvals — DHA Attendance" },
    { name: "description", content: "Review and approve or reject pending leave requests." },
    { property: "og:title", content: "Approvals — DHA Attendance" },
    { property: "og:description", content: "Review and approve or reject pending leave requests." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ApprovalsPage,
});
