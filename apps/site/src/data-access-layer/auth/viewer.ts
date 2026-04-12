
import { authClient, BetterAuthSession } from "@/lib/better-auth/client";
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
    // const { data, error } = await authClient.getSession();
    const data = {
      user: {
        id: "1",
        name: "John Doe",
        email: "john.doe@example.com",
        image: "https://github.com/shadcn.png",
      },
      session: {
        id: "1",
        userId: "1",
        deviceId: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    const error = null;
    if (error) {
      return { data: null, error };
    }
    return { data, error: null };
  },
});

export function useViewer() {
  const qc = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
      qc.invalidateQueries(viewerqueryOptions);
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

export const viewerMiddleware = createMiddleware()
.server(async ({ next, request }) => {
  const headers = getRequestHeaders();
  // const data = await honoClient.api.viewer.$get({}, {
  //   headers,
  // });
  // const json = await data.json();
  // if (!data.ok || !json.user) {
  //   const returnTo = safeStringToUrl(request.url)?.pathname ?? "/";
  //   throw redirect({ to: "/auth", search: { returnTo } });
  // }
  return await next();
});
