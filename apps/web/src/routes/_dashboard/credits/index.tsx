import { clientEnv } from "@/lib/env/client-env";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CreditsLedgerList } from "./-components/CreditsLedgerList";
import { CreditsSummaryCard } from "./-components/CreditsSummaryCard";
import { HowCreditsWorkCard } from "./-components/HowCreditsWorkCard";
import { CreditsWaitlistCard } from "./-components/CreditsWaitlistCard";

const creditsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_dashboard/credits/")({
  validateSearch: creditsSearchSchema,
  component: CreditsPage,
  head: () => ({ meta: [{ title: "Résumé credits" }] }),
});

/**
 * Credits page (Phase 2: visible, not enforced). Editing stays free; credits
 * are charged when a new résumé is created. Hidden entirely when the flag is
 * off so the rollout stays controlled.
 */
function CreditsPage() {
  if (clientEnv.VITE_CREDITS_ENABLED !== "true") {
    return (
      <div className="p-6 text-sm text-muted-foreground" data-test="credits-disabled">
        Credits are not enabled yet.
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-6" data-test="credits-page">
      <div className="flex flex-col gap-1 p-4 md:p-6">
        <h1 className="text-2xl font-semibold text-base-content">Résumé credits</h1>
        <p className="text-sm text-muted-foreground">
          Editing is always free. Credits are only spent when you create a new résumé.
        </p>
      </div>
      <div className="flex flex-col gap-6 px-4 md:px-6">
        <CreditsSummaryCard />
        <CreditsWaitlistCard />
        <HowCreditsWorkCard />
        <CreditsLedgerList />
      </div>
    </div>
  );
}
