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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOAuthRedirectUrl(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  return typeof value.url === "string" ? value.url : undefined;
}

function getSignedInUserName(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.user)) return "there";
  return typeof value.user.name === "string" ? value.user.name : "there";
}

function hasOAuthProviderQuery(): boolean {
  if (typeof window === "undefined") return false;
  const search = new URLSearchParams(window.location.search);
  return search.has("client_id") && search.has("sig");
}

export function SigninComponent({ onBackToSessions }: SigninComponentProps) {
  const [showPassword, setShowPassword] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();
  const { returnTo, callbackURL } = Route.useSearch();
  const navigate = useNavigate({ from: "/auth/" });

  const postLoginDestination = callbackURL || returnTo || "/";

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
      const oauthRedirectUrl = getOAuthRedirectUrl(data);
      if (oauthRedirectUrl) {
        window.location.href = oauthRedirectUrl;
        return;
      }

      toast.success("Signed in", {
        description: `Welcome back ${getSignedInUserName(data)}`,
      });
      await router.invalidate();
      await qc.fetchQuery(viewerqueryOptions);
      if (callbackURL) {
        window.location.href = callbackURL;
      } else {
        void navigate({ to: returnTo || "/", search: { returnTo: returnTo || "/" } });
      }
    },
  });

  const githubMutation = useMutation({
    mutationFn: async () => {
      const socialCallbackURL = hasOAuthProviderQuery() ? undefined : postLoginDestination;
      await authClient.signIn.social({
        provider: "github",
        ...(socialCallbackURL ? { callbackURL: socialCallbackURL } : {}),
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
        className="border-border/40 bg-card/30 flex h-full w-[90%] flex-col items-center justify-center gap-6 rounded-lg border p-[2%] shadow-sm md:w-[70%] lg:w-[40%]"
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
          <h1 className="text-foreground text-4xl font-bold">Sign in</h1>

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
          <div className="via-border h-px flex-1 bg-linear-to-r from-transparent to-transparent" />
          <span className="text-muted-foreground text-xs font-medium">OR</span>
          <div className="via-border h-px flex-1 bg-linear-to-r from-transparent to-transparent" />
        </div>

        <button
          type="button"
          disabled={githubMutation.isPending || mutation.isPending}
          onClick={() => githubMutation.mutate()}
          className="btn bg-primary/20 text-foreground w-full gap-2"
        >
          <Github className="size-5" />
          <span className="font-semibold">Continue with GitHub</span>
        </button>

        <div className="flex w-full flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center gap-1 text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account?</span>
            <Link
              to="/auth/signup"
              search={{ returnTo, callbackURL }}
              className="link link-primary font-semibold"
            >
              Sign up
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
