import { authClient } from "@/lib/better-auth/client";
import { mutationOptions } from "@tanstack/react-query";

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
