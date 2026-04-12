import { Footer } from "@/components/navigation/Footer";
import { ResponsiveGenericToolbar } from "@/components/navigation/ResponsiveGenericToolbar";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppConfig } from "@/utils/system";
import { SignupComponent } from "./-components/SignupComponent";

const searchparams = z.object({
  returnTo: z.string().optional().catch("/"),
});
export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
  validateSearch: (search) => searchparams.parse(search),
  head: () => ({
    meta: [
      {
        title: `${AppConfig.name} | Sign up`,
        description: "Create a new account",
      },
    ],
  }),
});

export function SignupPage() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center">
      <ResponsiveGenericToolbar>
        <SignupComponent />
        <Footer />
      </ResponsiveGenericToolbar>
    </div>
  );
}
