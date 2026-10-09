import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "@/components/pages/auth";

type SignInSearch = { redirect?: string };

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in — DHA Attendance" },
      { name: "description", content: "Access the DHA Company employee attendance portal." },
      { property: "og:title", content: "Sign in — DHA Attendance" },
      { property: "og:description", content: "Access the DHA Company employee attendance portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): SignInSearch =>
    typeof search["redirect"] === "string" && search["redirect"].startsWith("/")
      ? { redirect: search["redirect"] }
      : {},
  ssr: false,
  component: SignInRoute,
});

function SignInRoute() {
  const { redirect } = Route.useSearch();
  return <SignInPage redirect={redirect} />;
}
