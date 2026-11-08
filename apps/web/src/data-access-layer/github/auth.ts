import { authClient } from "@/lib/better-auth/client";
import { mutationOptions } from "@tanstack/react-query";

export const githubAuthRedirect = {
  to: "/auth/github",
  search: { returnTo: "/dashboard/projects" },
} as const;

/**
 * Better Auth 1.7 selects accounts by local `account.id` (or the account
 * cookie) instead of `providerId`, so resolve the GitHub account first.
 */
export async function fetchGithubAccessToken(): Promise<string | null> {
  const accounts = await authClient.listAccounts();
  if (accounts.error) {
    throw new Error("Failed to list linked accounts");
  }

  const githubAccount = accounts.data.find((account) => account.providerId === "github");
  if (!githubAccount) {
    return null;
  }

  const token = await authClient.getAccessToken({ accountId: githubAccount.id });
  if (token.error || !token.data?.accessToken) {
    return null;
  }

  return token.data.accessToken;
}

export const githubAuthMutationOptions = mutationOptions({
  mutationFn: async ({ callbackURL }: { callbackURL: string }) => {
    const data = await authClient.signIn.social({
      provider: "github",
      callbackURL,
    });
    if (data.error) throw data.error;
    return data.data;
  },
});
