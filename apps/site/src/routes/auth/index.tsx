import { Footer } from "@/components/navigation/Footer";
import { ResponsiveGenericToolbar } from "@/components/navigation/ResponsiveGenericToolbar";
import { Spinner } from "@/components/ui/spinner";
import { deviceSessionsQueryOptions } from "@/data-access-layer/auth/device-sessions";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AppConfig } from "@/utils/system";
import { SessionPicker } from "./-components/SessionPicker";
import { SigninComponent } from "./-components/SigninComponent";

const searchparams = z.object({
  returnTo: z.string().default("/"),
  useAnotherAccount: z.boolean().default(false).optional(),
});
export const Route = createFileRoute("/auth/")({
  component: SigninPage,
  validateSearch: (search) => searchparams.parse(search),
  async beforeLoad(ctx) {
    const viewer = ctx.context?.viewer;
    const returnTo = ctx.search?.returnTo ?? "/";
    const useAnotherAccount = ctx.search?.useAnotherAccount ?? false;
    if (viewer?.user && !useAnotherAccount) {
      throw redirect({ to: returnTo });
    }
  },
  head: () => ({
    meta: [
      {
        title: `${AppConfig.name} | Sign in`,
        description: "Login to your account",
      },
    ],
  }),
});

export function SigninPage() {
  const [showSigninForm, setShowSigninForm] = useState(false);
  const { data: sessions = [], isLoading } = useQuery(deviceSessionsQueryOptions);

  const hasDeviceSessions = sessions.length > 0 && !showSigninForm;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <ResponsiveGenericToolbar>
        <div className="flex min-h-screen flex-col">
          {isLoading ? (
            <div className="flex h-full flex-1 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : hasDeviceSessions ? (
            <SessionPicker onUseAnotherAccount={() => setShowSigninForm(true)} />
          ) : (
            <SigninComponent
              onBackToSessions={sessions.length > 0 ? () => setShowSigninForm(false) : undefined}
            />
          )}
        </div>
        <Footer />
      </ResponsiveGenericToolbar>
    </div>
  );
}
