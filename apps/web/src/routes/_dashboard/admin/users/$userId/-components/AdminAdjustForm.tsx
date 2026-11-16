import { adminAdjustCreditsMutationOptions } from "@/data-access-layer/credits/credits-query-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

function bucketOf(value: string): "monthly" | "bonus" {
  if (value === "monthly") return "monthly";
  return "bonus";
}

/** Admin action: signed adjustment of the monthly or bonus bucket. */
export function AdminAdjustForm({ userId }: { userId: string }) {
  const [bucket, setBucket] = useState<"monthly" | "bonus">("bonus");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    ...adminAdjustCreditsMutationOptions(),
    onSuccess() {
      toast.success("Credits adjusted");
      setAmount("");
      setReason("");
    },
    onError(error) {
      toast.error("Could not adjust credits", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const parsedAmount = Number.parseInt(amount, 10);
  const valid = Number.isInteger(parsedAmount) && parsedAmount !== 0 && reason.trim().length > 0;

  return (
    <Card data-test="admin-adjust-credits">
      <CardHeader>
        <CardTitle className="text-base">Adjust a bucket</CardTitle>
        <CardDescription>
          Signed amount: positive adds, negative removes. Changes below zero are rejected.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Select value={bucket} onValueChange={(value) => setBucket(bucketOf(value))}>
          <SelectTrigger data-test="admin-adjust-bucket">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="bonus">Bonus</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Signed amount (e.g. -2)"
          aria-label="Signed amount"
          data-test="admin-adjust-amount"
        />
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (required, shown in the ledger)"
          aria-label="Reason"
          data-test="admin-adjust-reason"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!valid || mutation.isPending}
          onClick={() =>
            mutation.mutate({ userId, bucket, amount: parsedAmount, reason: reason.trim() })
          }
          data-test="admin-adjust-submit"
        >
          Adjust
        </Button>
      </CardContent>
    </Card>
  );
}
