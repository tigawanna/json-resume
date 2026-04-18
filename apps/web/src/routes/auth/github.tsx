import { ResponsiveGenericToolbar } from "@/components/navigation/ResponsiveGenericToolbar";
import { githubAuthMutationOptions } from "@/data-access-layer/github/auth";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { AppConfig } from "@/utils/system";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { GithubIcon } from "lucide-react";
import { z } from "zod";

const searchparams = z.object({
  returnTo: z.string().default("/"),
  useAnotherAccount: z.boolean().default(false).optional(),
});

export const Route = createFileRoute("/auth/github")({
  component: RouteComponent,
  validateSearch: (search) => searchparams.parse(search),
  async beforeLoad(ctx) {
    const viewer = ctx.context?.viewer;
    const returnTo = ctx.search?.returnTo ?? "/";
    const useAnotherAccount = ctx.search?.useAnotherAccount ?? false;
    const hasGithubToken = !!ctx.context?.queryClient.getQueryData<string>([
      queryKeyPrefixes.githubAccessToken,
    ]);
    if (viewer?.user && hasGithubToken && !useAnotherAccount) {
      throw redirect({ to: returnTo });
    }
  },
  head: () => ({
    meta: [
      {
        title: `${AppConfig.name} | GitHub Sign in`,
        description: "Sign in to manage your GitHub repositories and exports",
      },
    ],
  }),
});

function RouteComponent() {
  const mutation = useMutation(githubAuthMutationOptions);
  const { returnTo } = Route.useSearch();

  const handleGitHubSignin = () => {
    mutation.mutate({
      callbackURL: new URL(returnTo, window.location.origin).toString(),
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <ResponsiveGenericToolbar>
        <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
          <div className="bg-base-300/40 pointer-events-none absolute inset-0 backdrop-blur-[2px]" />

          <div className="bg-base-100/95 border-base-content/10 relative w-full max-w-md rounded-2xl border p-8 shadow-[0_22px_48px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_56px_rgba(16,185,129,0.18)]">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="bg-base-200 text-base-content grid size-14 place-items-center rounded-full">
                <GithubIcon className="size-7" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Sign in with GitHub</h1>
              <p className="text-base-content/70 text-sm">
                Connect your account to sync repositories and export your resume data.
              </p>
            </div>

            <button
              type="button"
              data-test="github-signin-btn"
              disabled={mutation.isPending}
              className="btn btn-primary mt-7 w-full"
              onClick={handleGitHubSignin}>
              <GithubIcon className="size-4" />
              {mutation.isPending ? "Redirecting to GitHub..." : "Continue with GitHub"}
            </button>
          </div>
        </div>
      </ResponsiveGenericToolbar>
    </div>
  );
}
