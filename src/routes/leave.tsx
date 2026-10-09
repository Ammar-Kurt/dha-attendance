import { createFileRoute } from "@tanstack/react-router";
import { LeavePage } from "@/components/pages/leave";
import { Protected } from "@/components/shell";

export const Route = createFileRoute("/leave")({
  head: () => ({
    meta: [
      { title: "Leave — DHA Attendance" },
      { name: "description", content: "Request leave and track approvals and balances." },
      { property: "og:title", content: "Leave — DHA Attendance" },
      { property: "og:description", content: "Request leave and track approvals and balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Protected pages depend on the browser session, so they render on the client only.
  ssr: false,
  component: () => (
    <Protected>
      <LeavePage />
    </Protected>
  ),
});
