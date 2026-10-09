import { createFileRoute } from "@tanstack/react-router";
import { SignUpPage } from "@/components/pages/auth";

export const Route = createFileRoute("/sign-up")({
  head: () => ({
    meta: [
      { title: "Create account — DHA Attendance" },
      { name: "description", content: "Sign up for the DHA Company attendance portal." },
      { property: "og:title", content: "Create account — DHA Attendance" },
      { property: "og:description", content: "Sign up for the DHA Company attendance portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: SignUpPage,
});
