import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/better-auth/client";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { unwrapUnknownError } from "@/utils/errors";
import { AppConfig } from "@/utils/system";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function publicOAuthClientQueryOptions(clientId: string | undefined) {
  return queryOptions({
    queryKey: [queryKeyPrefixes.oauth2, "public-client", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await authClient.oauth2.publicClient({
        query: { client_id: clientId },
      });
      if (error) throw error;
      return data;
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getClientDisplayName(client: unknown, clientId: string | undefined): string {
  if (isRecord(client)) {
    const name = client.client_name ?? client.name;
    if (typeof name === "string" && name.trim().length > 0) return name;
  }
  return clientId ?? "this MCP client";
}

interface OAuthConsentCardProps {
  clientId?: string;
  scope?: string;
}

export function OAuthConsentCard({ clientId, scope }: OAuthConsentCardProps) {
  const { data: client } = useQuery(publicOAuthClientQueryOptions(clientId));
  const scopes = scope?.split(" ").filter(Boolean) ?? [];
  const clientName = getClientDisplayName(client, clientId);

  const consentMutation = useMutation({
    mutationFn: async (accept: boolean) => {
      const { data, error } = await authClient.oauth2.consent({ accept });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      window.location.href = data.url;
    },
    onError(err: unknown) {
      toast.error("Authorization failed", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  return (
    <Card className="border-primary/20 bg-base-100/90 w-full max-w-xl shadow-xl backdrop-blur">
      <CardHeader className="text-center">
        <div className="bg-primary/10 text-primary mx-auto flex size-14 items-center justify-center rounded-full">
          <ShieldCheck className="size-7" />
        </div>
        <CardTitle className="text-3xl">Authorize {clientName}</CardTitle>
        <CardDescription>
          Allow this app to connect to your {AppConfig.name} résumé tools.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="bg-base-200/70 rounded-lg p-4" data-test="oauth-consent-scopes">
          <p className="text-sm font-medium">Requested access</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {scopes.length > 0 ? (
              scopes.map((requestedScope) => (
                <span
                  key={requestedScope}
                  className="bg-base-100 text-base-content rounded-full px-3 py-1 text-xs font-medium"
                >
                  {requestedScope}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">No extra scopes requested.</span>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          After you authorize, your browser will return control to the requesting client so it can
          finish the OAuth token exchange.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={consentMutation.isPending}
          onClick={() => consentMutation.mutate(false)}
          data-test="oauth-consent-deny"
        >
          Deny
        </Button>
        <Button
          type="button"
          disabled={consentMutation.isPending}
          onClick={() => consentMutation.mutate(true)}
          data-test="oauth-consent-authorize"
        >
          Authorize
        </Button>
      </CardFooter>
    </Card>
  );
}
