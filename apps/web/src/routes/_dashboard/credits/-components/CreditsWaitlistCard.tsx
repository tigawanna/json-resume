import { creditWalletQueryOptions } from "@/data-access-layer/credits/credits-query-options";
import { WaitlistJoinDialog } from "@/routes/-components/waitlist/WaitlistJoinDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Mailbox } from "lucide-react";
import { useState } from "react";

/**
 * Nudge to join the waitlist, shown only when the wallet says the account has
 * no joined entry yet.
 */
export function CreditsWaitlistCard() {
  const { data: wallet } = useQuery(creditWalletQueryOptions);
  const [joinOpen, setJoinOpen] = useState(false);

  if (wallet?.waitlistJoined !== false) return null;

  return (
    <Card data-test="credits-waitlist-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mailbox className="size-4 text-primary" /> Want more than 20 credits a month?
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm text-muted-foreground">
          Join the waitlist to hear when higher limits and Pro features open. Joining does not
          change your current allowance.
        </p>
        <Button type="button" size="sm" onClick={() => setJoinOpen(true)}>
          Join the waitlist
        </Button>
        <WaitlistJoinDialog open={joinOpen} onOpenChange={setJoinOpen} source="dashboard" />
      </CardContent>
    </Card>
  );
}
