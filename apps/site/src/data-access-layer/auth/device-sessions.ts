import { authClient, type BetterAuthSession } from "@/lib/better-auth/client";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { queryKeyPrefixes } from "../query-keys";

export type DeviceSession = {
  session: BetterAuthSession["session"];
  user: BetterAuthSession["user"];
};

export const deviceSessionsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.deviceSessions],
  queryFn: async () => {
    const { data, error } = await authClient.multiSession.listDeviceSessions();
    if (error) throw error;
    return data as DeviceSession[];
  },
  retry: false,
});



export const setActiveSessionMutationOptions = mutationOptions({
  mutationFn: async (sessionToken: string) => {
    const { data, error } = await authClient.multiSession.setActive({
      sessionToken,
    });
    if (error) throw error;
    return data;
  },
  meta: {
    invalidates: [[queryKeyPrefixes.deviceSessions], [queryKeyPrefixes.viewer]],
  },
});
