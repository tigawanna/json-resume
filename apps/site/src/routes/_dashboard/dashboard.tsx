import { authClient } from "@/lib/better-auth/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data, error } = useSuspenseQuery({
    queryKey: ["multi-session"],
    queryFn: async () => {
      const { data, error } = await authClient.multiSession.listDeviceSessions();
      if (error) throw error;
      return data;
    },
  });
  const selectSessionMutation = useMutation({
    mutationFn: async (sessionToken: string) => {
      const { data, error } = await authClient.multiSession.setActive({
        sessionToken: sessionToken,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables, onMutResult, ctx) => {
      ctx.client.invalidateQueries({ queryKey: ["multi-session"] });
    },
  });
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-base-content/70">Your dashboard</p>
      <ul>
        {data.map(({ session }) => (
          <li key={session.id}>
            <button onClick={() => selectSessionMutation.mutate(session.token)}>
              {session.token}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
