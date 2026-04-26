import { viewerqueryOptions } from "@/data-access-layer/auth/viewer";
import { authClient } from "@/lib/better-auth/client";
import { useAppForm } from "@/lib/tanstack/form";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

type SignupUserPayload = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  image: string | undefined;
};

const formOpts = formOptions({
  defaultValues: {
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    image: undefined,
  } satisfies SignupUserPayload,
});

export function SignupComponent() {
  const { returnTo } = useSearch({ from: "/auth/signup" });
  const [showPassword, setShowPassword] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async (data: SignupUserPayload) => {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        image: data.image,
      });
      if (result.error) throw result.error;
      return result.data;
    },
    async onSuccess(data) {
      toast.success("Signed up", {
        description: `Welcome ${data?.user?.name}`,
      });
      await router.invalidate();
      await qc.fetchQuery(viewerqueryOptions);
      void navigate({ to: returnTo ?? "/profile" });
    },
    onError(error) {
      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 10_000,
      });
    },
  });

  const githubMutation = useMutation({
    mutationFn: async () => {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: returnTo ?? "/profile",
      });
    },
    onError: async (error: unknown) => {
      toast.error("GitHub sign-up failed", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 10_000,
      });
    },
  });

  const form = useAppForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      const formData = value as SignupUserPayload;
      if (formData.password !== formData.passwordConfirm) {
        throw new Error("Passwords don't match");
      }
      try {
        await mutation.mutateAsync(formData);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error("Something went wrong", { description: message, position: "top-center" });
      }
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
        className="bg-base-300/20 flex h-full w-[90%] flex-col items-center justify-center gap-6 rounded-lg p-[2%] md:w-[70%] lg:w-[40%]"
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <h1 className="text-4xl font-bold">Sign up</h1>

          <form.AppField
            name="name"
            validators={{
              onChange: z.string().min(1, "Name is required"),
            }}
          >
            {(field) => (
              <field.TextField label="Username" name="username" autoComplete="username" />
            )}
          </form.AppField>

          <form.AppField
            name="email"
            validators={{
              onChange: z.email("Invalid email address"),
            }}
          >
            {(field) => <field.EmailField autoComplete="section-signup email" inputMode="email" />}
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
                autoComplete="section-signup new-password"
              />
            )}
          </form.AppField>

          <form.AppField
            name="passwordConfirm"
            validators={{
              onChange: z.string().min(8, "Password must be at least 8 characters"),
              onChangeListenTo: ["password"],
              onChangeAsyncDebounceMs: 500,
            }}
          >
            {(field) => (
              <field.PasswordField
                label="Confirm password"
                showPassword={showPassword}
                autoComplete="section-signup new-password"
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
          <form.SubmitButton label="Sign up" className="w-full" />
        </form.AppForm>

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
          <span className="text-xs font-medium text-gray-500">OR</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
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

        <div className="flex items-center justify-center gap-1 text-sm">
          <span className="text-gray-400">Already have an account?</span>
          <Link
            to="/auth"
            search={{ returnTo: returnTo ?? "/" }}
            className="link link-primary font-semibold"
          >
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
