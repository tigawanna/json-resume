import { WaitlistJoinForm } from "@/routes/-components/waitlist/WaitlistJoinForm";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/waitlist/")({
  component: WaitlistPage,
  head: () => ({
    meta: [
      { title: `Join the waitlist · ${AppConfig.name}` },
      {
        name: "description",
        content: `Leave your email to hear when ${AppConfig.name} Pro opens. No payment, no spam.`,
      },
    ],
  }),
});

function WaitlistPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border/60 bg-base-100 p-6 md:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Waitlist</p>
        <h1 className="mt-3 font-serif text-3xl tracking-tight text-base-content">
          Be first in line for Pro
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The core is free and open source. Pro features are in the works — leave your email and
          we'll reach out when they open.
        </p>
        <div className="mt-6">
          <WaitlistJoinForm source="waitlist-page" />
        </div>
      </div>
    </div>
  );
}
