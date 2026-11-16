import { clientEnv } from "@/lib/env/client-env";
import { creditWalletQueryOptions } from "@/data-access-layer/credits/credits-query-options";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";

/**
 * Compact wallet summary for the dashboard home. Only rendered when credits
 * are enabled: Phase 2 is "visible, not enforced".
 */
export function CreditBalanceCard() {
  if (clientEnv.VITE_CREDITS_ENABLED !== "true") return null;

  return (
    <div
      className="w-full max-w-[90%] md:max-w-[70%]"
      data-test="credit-balance-card"
    >
      <CreditBalanceCardContent />
    </div>
  );
}

function CreditBalanceCardContent() {
  const { data: wallet, isPending } = useQuery(creditWalletQueryOptions);

  return (
    <Link
      to="/credits"
      className="flex items-center gap-3 rounded-lg border border-border/60 bg-base-100 px-4 py-3 transition-colors hover:border-primary/40"
    >
      <Coins className="size-5 shrink-0 text-primary" />
      {isPending || !wallet ? (
        <span className="text-sm text-muted-foreground">Credits…</span>
      ) : (
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
          <span className="font-medium text-base-content">
            {wallet.available} résumé credit{wallet.available === 1 ? "" : "s"}
          </span>
          {wallet.bonus > 0 ? (
            <span className="text-xs text-muted-foreground">
              ({wallet.monthly} monthly + {wallet.bonus} bonus)
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">this month</span>
          )}
          <span className="ml-auto text-xs text-primary">Manage →</span>
        </span>
      )}
    </Link>
  );
}
