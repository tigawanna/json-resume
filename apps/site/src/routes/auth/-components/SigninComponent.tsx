import { useAppForm } from "@/lib/tanstack/form";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Route } from "../index";
import { TViewerLoginPayload, viewerqueryOptions } from "@/data-access-layer/auth/viewer";
import { authClient } from "@/lib/better-auth/client";

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
      navigate({ to: returnTo || "/", search: { returnTo: returnTo || "/" } });
    },
  });

  const form = useAppForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      await mutation.mutate(value as TViewerLoginPayload);
    },
  });

  return (
    <div className="flex h-full w-full items-center justify-evenly gap-2 p-5">
      <img src="/logo.svg" alt="logo" className="hidden w-[30%] object-cover md:flex" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex h-full w-[90%] flex-col items-center justify-center gap-6 rounded-lg p-[2%] md:w-[70%] lg:w-[40%]">
        <div className="flex w-full flex-col items-center justify-center gap-4">
          {onBackToSessions && (
            <button
              type="button"
              onClick={onBackToSessions}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-sm transition-colors">
              <ArrowLeft className="size-4" />
              Back to accounts
            </button>
          )}
          <h1 className="text-4xl font-bold">Sign in</h1>

          <form.AppField
            name="email"
            validators={{
              onChange: z.string().min(1, "Email is required"),
            }}>
            {(field) => <field.TextField label="Email or username" />}
          </form.AppField>

          <form.AppField
            name="password"
            validators={{
              onChange: z.string().min(8, "Password must be at least 8 characters"),
            }}>
            {(field) => <field.PasswordField label="Password" showPassword={showPassword} />}
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

        <div className="flex w-full flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-1">
            <span>Don&apos;t have an account?</span>
            <Link to="/auth/signup" search={{ returnTo }} className="link link-primary">
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
