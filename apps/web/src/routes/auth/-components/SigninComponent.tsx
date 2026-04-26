import { TViewerLoginPayload, viewerqueryOptions } from "@/data-access-layer/auth/viewer";
import { authClient } from "@/lib/better-auth/client";
import { useAppForm } from "@/lib/tanstack/form";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Github } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Route } from "../index";

interface SigninComponentProps {
  onBackToSessions?: () => void;
}

const formOpts = formOptions({
  defaultValues: {
    email: "",
    password: "",
  } satisfies TViewerLoginPayload,
});

export function SigninComponent({ onBackToSessions }: SigninComponentProps) {
  const [showPassword, setShowPassword] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate({ from: "/auth/" });

  const mutation = useMutation({
    mutationFn: async (payload: TViewerLoginPayload) => {
      const { data, error } = await authClient.signIn.email({
        email: payload.email,
        password: payload.password,
      });
      if (error) throw error;
      return data;
    },
    onError: async (error) => {
      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 10_000,
      });
    },
    onSuccess: async (data) => {
      toast.success("Signed in", {
        description: `Welcome back ${data.user.name}`,
      });
      await router.invalidate();
      await qc.fetchQuery(viewerqueryOptions);
      void navigate({ to: returnTo || "/", search: { returnTo: returnTo || "/" } });
    },
  });

  const githubMutation = useMutation({
    mutationFn: async () => {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: returnTo || "/",
      });
    },
    onError: async (error: unknown) => {
      toast.error("GitHub sign-in failed", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 10_000,
      });
    },
  });

  const form = useAppForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      mutation.mutate(value as TViewerLoginPayload);
    },
  });

  return (
    <div className="flex h-full w-full items-center justify-evenly gap-2 p-5">
      <img src="/logo.svg" alt="logo" className="hidden w-[30%] object-cover md:flex" />
      <form
        autoComplete="on"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();

          void form.handleSubmit();
        }}
        className="flex h-full w-[90%] flex-col items-center justify-center gap-6 rounded-lg p-[2%] md:w-[70%] lg:w-[40%]"
      >
        <div className="flex w-full flex-col items-center justify-center gap-4">
          {onBackToSessions && (
            <button
              type="button"
              onClick={onBackToSessions}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-sm transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to accounts
            </button>
          )}
          <h1 className="text-4xl font-bold">Sign in</h1>

          <form.AppField
            name="email"
            validators={{
              onChange: z.string().min(1, "Email is required"),
            }}
          >
            {(field) => (
              <field.TextField label="Email or username" name="username" autoComplete="username" />
            )}
          </form.AppField>

          <form.AppField
            name="password"
            validators={{
              onChange: z.string().min(8, "Password must be at least 8 characters"),
            }}
          >
            {(field) => (
              <field.PasswordField
                label="Password"
                showPassword={showPassword}
                autoComplete="current-password"
              />
            )}
          </form.AppField>

          <div className="w-full">
            <div className="flex w-full items-center justify-center gap-3">
              <label htmlFor="showPassword" className="text-sm">
                Show password
              </label>
              <input
                type="checkbox"
                id="showPassword"
                name="showPassword"
                autoComplete="off"
                className="checkbox-primary checkbox ring-primary ring-1"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>
        </div>

        <form.AppForm>
          <form.SubmitButton label="Sign in" className="w-full" />
        </form.AppForm>

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-400 to-transparent" />
          <span className="text-xs font-medium text-gray-500">OR</span>
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-400 to-transparent" />
        </div>

        <button
          type="button"
          disabled={githubMutation.isPending || mutation.isPending}
          onClick={() => githubMutation.mutate()}
          className="btn btn-ghost border border-gray-600 w-full gap-2 hover:border-gray-400 hover:bg-gray-900"
        >
          <Github className="size-5" />
          <span className="font-semibold">Continue with GitHub</span>
        </button>

        <div className="flex w-full flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center gap-1 text-sm">
            <span className="text-gray-400">Don&apos;t have an account?</span>
            <Link
              to="/auth/signup"
              search={{ returnTo }}
              className="link link-primary font-semibold"
            >
              Sign up
            </Link>
          </div>
          {/* <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={mutation.isPending}
              className="btn btn-primary btn-sm"
              onClick={() => {
                form.setFieldValue("email", "stranger1@email.com");
                form.setFieldValue("password", "stranger1@email.com");
              }}
            >
              Login as stranger 1
            </button>
            <button
              type="button"
              disabled={mutation.isPending}
              className="btn btn-secondary btn-sm"
              onClick={() => {
                form.setFieldValue("email", "stranger2@email.com");
                form.setFieldValue("password", "stranger2@email.com");
              }}
            >
              Login as stranger 2
            </button>
          </div> */}
        </div>
      </form>
    </div>
  );
}
