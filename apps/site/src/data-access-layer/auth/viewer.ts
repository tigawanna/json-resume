import { authClient, BetterAuthSession } from "@/lib/better-auth/client";
import { getSession } from "@/lib/auth.functions";
import { auth } from "@/lib/auth";
import { safeStringToUrl } from "@/utils/url";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

type ViewerUser = BetterAuthSession["user"];
type ViewerSession = BetterAuthSession["session"];

// export type BetterAuthUserRoles = "tenant" | "staff" | "admin" | "manager";
export type TViewer = {
  user?: ViewerUser;
  session?: ViewerSession;
};
export type TViewerLoginPayload = { email: string; password: string };

export const viewerqueryOptions = queryOptions({
  queryKey: ["viewer"],
  queryFn: async () => {
    const session = await getSession();
    if (!session) {
      return { data: null, error: null };
    }
    return {
      data: { user: session.user, session: session.session },
      error: null,
    };
  },
});

export function useViewer() {
  const qc = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
      void qc.invalidateQueries(viewerqueryOptions);
      throw redirect({ to: "/auth", search: { returnTo: "/" } });
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
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
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
