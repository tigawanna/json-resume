import { authClient } from "@/lib/better-auth/client";
import { viewerControllerViewer } from "@/services/nest/client";
import { ResponseError } from "@/services/nest/generated/.kubb/client";
import type { ViewerResponseDto } from "@/services/nest/generated/models";
import { safeStringToUrl } from "@/utils/url";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

type ViewerPayload = ViewerResponseDto;
type ViewerUser = ViewerPayload["user"];
type ViewerSession = ViewerPayload["session"];

export type TViewer = {
  user?: ViewerUser;
  session?: ViewerSession;
};
export type TViewerLoginPayload = { email: string; password: string };

const loggedOutViewer = { data: null, error: null } as const;

async function loadViewer() {
  try {
    const session = await viewerControllerViewer<true>();
    return {
      data: { user: session.user, session: session.session },
      error: null,
    };
  } catch (err: unknown) {
    if (!(ResponseError.is(err) && err.status === 401)) {
      console.warn("[auth] viewer query failed; treating as logged out", err);
    }
    return loggedOutViewer;
  }
}

export const viewerqueryOptions = queryOptions({
  queryKey: ["viewer"],
  retry: false,
  queryFn: loadViewer,
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
  const viewer = await loadViewer();
  if (!viewer.data?.user) {
    const returnTo = safeStringToUrl(request.url)?.pathname ?? "/";
    throw redirect({ to: "/auth", search: { returnTo } });
  }
  return await next({
    context: {
      viewer: viewer.data,
    },
  });
});
