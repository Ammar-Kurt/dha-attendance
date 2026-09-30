import { createFileRoute } from "@tanstack/react-router";
import { LeaveHolidaysPage } from "@/components/dha-app";

export const Route = createFileRoute("/leave-holidays")({
  head: () => ({ meta: [
    { title: "Leave & Holidays — DHA Attendance" },
    { name: "description", content: "Set leave policies and the public holiday calendar." },
    { property: "og:title", content: "Leave & Holidays — DHA Attendance" },
    { property: "og:description", content: "Set leave policies and the public holiday calendar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: LeaveHolidaysPage,
});
