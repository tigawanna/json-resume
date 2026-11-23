import { creditWalletQueryOptions } from "@/data-access-layer/credits/credits-query-options";
import { formatLocaleDate } from "@/utils/date-helpers";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Coins, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreditWalletResponse } from "@/data-access-layer/credits/credits-query-options";

/** Live wallet: available credits, monthly/bonus split, and the reset date. */
export function CreditsSummaryCard() {
  const query = useQuery(creditWalletQueryOptions);

  return (
    <Card data-test="credits-summary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="size-4 text-primary" /> Your balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SummaryBody query={query} />
      </CardContent>
    </Card>
  );
}

function SummaryBody({ query }: { query: ReturnType<typeof useQuery<CreditWalletResponse>> }) {
  if (query.isPending) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (query.error || !query.data) {
    return <p className="text-sm text-destructive">Could not load your credits.</p>;
  }

  const wallet = query.data;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-3xl font-semibold text-base-content">
        {wallet.available}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          credit{wallet.available === 1 ? "" : "s"} available
        </span>
      </p>
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          {wallet.monthly} monthly · resets {formatLocaleDate(wallet.resetsAt)}
        </span>
        {wallet.bonus > 0 ? (
          <span className="inline-flex items-center gap-1 text-base-content">
            <Gift className="size-3.5 text-primary" /> {wallet.bonus} bonus (carry over)
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="size-3.5" />1 credit = 1 résumé
        </span>
      </div>
    </div>
  );
}
