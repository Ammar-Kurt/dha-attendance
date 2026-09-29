import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/dha-app";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Sign in — DHA Attendance" },
    { name: "description", content: "Access the DHA Company employee attendance portal." },
    { property: "og:title", content: "Sign in — DHA Attendance" },
    { property: "og:description", content: "Access the DHA Company employee attendance portal." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: LoginPage,
});
