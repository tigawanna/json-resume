import { adminGrantCreditsMutationOptions } from "@/data-access-layer/credits/credits-query-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

/** Admin action: grant bonus credits (they carry over across resets). */
export function AdminGrantForm({ userId }: { userId: string }) {
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    ...adminGrantCreditsMutationOptions(),
    onSuccess() {
      toast.success("Bonus credits granted");
      setReason("");
    },
    onError(error) {
      toast.error("Could not grant credits", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const parsedAmount = Number.parseInt(amount, 10);
  const valid = Number.isInteger(parsedAmount) && parsedAmount >= 1 && reason.trim().length > 0;

  return (
    <Card data-test="admin-grant-credits">
      <CardHeader>
        <CardTitle className="text-base">Grant bonus credits</CardTitle>
        <CardDescription>Bonus credits carry over across monthly resets.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label="Amount"
          data-test="admin-grant-amount"
        />
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (required, shown in the ledger)"
          aria-label="Reason"
          data-test="admin-grant-reason"
        />
        <Button
          type="button"
          size="sm"
          disabled={!valid || mutation.isPending}
          onClick={() => mutation.mutate({ userId, amount: parsedAmount, reason: reason.trim() })}
          data-test="admin-grant-submit"
        >
          Grant
        </Button>
      </CardContent>
    </Card>
  );
}
