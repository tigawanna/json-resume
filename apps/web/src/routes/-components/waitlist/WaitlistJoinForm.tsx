import {
  joinWaitlistMutationOptions,
  type WaitlistSource,
} from "@/data-access-layer/waitlist/waitlist-query-options";
import { authClient } from "@/lib/better-auth/client";
import { useAppForm } from "@/lib/tanstack/form";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

type WaitlistJoinValues = {
  email: string;
  name: string;
  consent: boolean;
};

const defaultValues: WaitlistJoinValues = {
  email: "",
  name: "",
  consent: false,
};

const formOpts = formOptions({ defaultValues });

/**
 * Public waitlist join form. Shared by the landing dialog and `/waitlist`.
 * Includes a honeypot field (`website`) that real users never see.
 */
export function WaitlistJoinForm({ source }: { source: WaitlistSource }) {
  const [joined, setJoined] = useState(false);
  const websiteRef = useRef<HTMLInputElement>(null);
  const session = authClient.useSession();

  const joinMutation = useMutation({
    ...joinWaitlistMutationOptions,
    onSuccess() {
      setJoined(true);
    },
    onError(error) {
      toast.error("Could not join the waitlist", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const form = useAppForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      await joinMutation.mutateAsync({
        email: value.email.trim(),
        name: value.name.trim() || undefined,
        source,
        website: websiteRef.current?.value ?? "",
      });
    },
  });

  // Prefill the email for a signed-in visitor.
  const sessionEmail = session.data?.user?.email;
  useEffect(() => {
    if (!sessionEmail) return;
    const current = form.getFieldValue("email");
    if (current === "") {
      form.setFieldValue("email", sessionEmail);
    }
  }, [form, sessionEmail]);

  if (joined) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-6 text-center"
        data-test="waitlist-join-success"
      >
        <CheckCircle2 className="size-8 text-primary" />
        <p className="font-medium">You're on the list.</p>
        <p className="text-sm text-muted-foreground">
          We'll reach out when paid plans open. Everyone gets 20 résumé credits a month in the
          meantime.
        </p>
      </div>
    );
  }

  return (
    <form
      autoComplete="on"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
      data-test="waitlist-join-form"
    >
      <form.AppField name="email" validators={{ onChange: z.email("Enter a valid email address") }}>
        {(field) => <field.EmailField label="Email" autoComplete="email" inputMode="email" />}
      </form.AppField>

      <form.AppField name="name" validators={{ onChange: z.string().max(120) }}>
        {(field) => <field.TextField label="Name (optional)" autoComplete="name" />}
      </form.AppField>

      <form.AppField
        name="consent"
        validators={{
          onChange: z.boolean().refine((value) => value, {
            message: "Please confirm to join",
          }),
        }}
      >
        {(field) => (
          <field.CheckboxField
            label="Keep me posted about paid plans and early access"
            description="No marketing spam. We only email about the launch."
          />
        )}
      </form.AppField>

      {/* Honeypot: visually hidden, out of tab order, ignored by real users. */}
      <input
        ref={websiteRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <form.AppForm>
        <form.SubmitButton
          label="Join the waitlist"
          className="w-full"
          data-test="waitlist-join-submit"
        />
      </form.AppForm>
    </form>
  );
}
