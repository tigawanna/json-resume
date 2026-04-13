import { Button } from "@/components/ui/button";
import { githubAuthMutationOptions } from "@/data-access-layer/github/auth";
import { authClient } from "@/lib/better-auth/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Github, Loader } from "lucide-react";

export const Route = createFileRoute("/_public/repos")({
  component: RouteComponent,
  beforeLoad: async (context) => {
    // console.log(context.context.viewer);
    // if (context.context.viewer?.user) {
    //   throw redirect({ to: "/dashboard" });
    // }
  },
});

function RouteComponent() {
  const mutation = useMutation(githubAuthMutationOptions);
  const { data: tokenData } = useQuery({
    queryKey: ["ghAccessToken"],
    queryFn: async () => {
      const response = await authClient.getAccessToken({
        providerId: "github",
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
  });
  console.log("token data == ",tokenData);
  return (
    <div className="flex flex-col gap-4 min-h-screen w-full justify-center items-center overflow-auto">
      <h1 className="text-2xl font-bold">Repositories</h1>
      <Button
        onClick={() => mutation.mutate({ callbackURL: "/repos" })}
        disabled={mutation.isPending}
        className="flex items-center gap-2">
        Login with Github <Github className="size-4" />
        {mutation.isPending && <Loader className="size-4 animate-spin" />}
      </Button>
    </div>
  );
}
