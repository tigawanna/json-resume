import { authClient, BetterAuthSession } from "@/lib/better-auth/client";
import { getSession } from "@/lib/auth.functions";
import { getSessionSafely } from "@/lib/auth-session";
import { safeStringToUrl } from "@/utils/url";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

type ViewerUser = BetterAuthSession["user"];
type ViewerSession = BetterAuthSession["session"];

// export type BetterAuthUserRoles = "tenant" | "staff" | "admin" | "manager";
export type TViewer = {
  user?: ViewerUser;
  session?: ViewerSession;
};
export type TViewerLoginPayload = { email: string; password: string };

const loggedOutViewer = { data: null, error: null } as const;

export const viewerqueryOptions = queryOptions({
  queryKey: ["viewer"],
  retry: false,
  queryFn: async () => {
    try {
      const session = await getSession();
      if (!session) {
        return loggedOutViewer;
      }
      return {
        data: { user: session.user, session: session.session },
        error: null,
      };
    } catch (err: unknown) {
      console.warn("[auth] viewer query failed; treating as logged out", err);
      return loggedOutViewer;
    }
  },
});

export function useViewer() {
  const qc = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
      void qc.invalidateQueries(viewerqueryOptions);
      throw redirect({ to: "/dashboard" });
    },
  });
  const viewerQuery = useSuspenseQuery(viewerqueryOptions);

  return {
    viewerQuery,
    viewer: {
      user: viewerQuery.data.data?.user,
      session: viewerQuery.data.data?.session,
    },
    logoutMutation,
  } as const;
}

export const viewerMiddleware = createMiddleware().server(async ({ next, request }) => {
  const session = await getSessionSafely(request.headers);
  if (!session) {
    const returnTo = safeStringToUrl(request.url)?.pathname ?? "/";
    throw redirect({ to: "/auth", search: { returnTo } });
  }
  return await next({
    context: {
      viewer: { user: session.user, session: session.session },
    },
  });
});
