import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { McpConsentCard } from "./-components/McpConsentCard";
import { OAuthConsentCard } from "./-components/OAuthConsentCard";

const searchParams = z
  .object({
    client_id: z.string().optional(),
    scope: z.string().optional(),
    mode: z.enum(["oauth", "mcp-connect"]).optional(),
  })
  .passthrough();

export const Route = createFileRoute("/oauth/consent/")({
  component: OAuthConsentPage,
  validateSearch: (search) => searchParams.parse(search),
  beforeLoad({ context, location }) {
    if (!context.viewer?.user) {
      throw redirect({ to: "/auth", search: { returnTo: location.href } });
    }
  },
});

function OAuthConsentPage() {
  const { client_id: clientId, scope, mode } = Route.useSearch();

  return (
    <main className="from-base-200 via-base-100 to-primary/10 flex min-h-screen items-center justify-center bg-linear-to-br p-6">
      {mode === "mcp-connect" ? (
        <McpConsentCard />
      ) : (
        <OAuthConsentCard clientId={clientId} scope={scope} />
      )}
    </main>
  );
}
