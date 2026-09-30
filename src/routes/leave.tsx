import { createFileRoute } from "@tanstack/react-router";
import { LeavePage } from "@/components/dha-app";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [
    { title: "Leave — DHA Attendance" },
    { name: "description", content: "Apply for leave and track your leave requests and balances." },
    { property: "og:title", content: "Leave — DHA Attendance" },
    { property: "og:description", content: "Apply for leave and track your leave requests and balances." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: LeavePage,
});
