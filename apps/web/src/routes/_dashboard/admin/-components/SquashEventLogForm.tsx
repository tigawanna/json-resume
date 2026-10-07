import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { adminSquashPreviewQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { squashEventLogFn } from "@/modules/admin/admin.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ALL_USERS, AdminUserSelect } from "./AdminUserSelect";

const HOUR = 60 * 60 * 1000;
const RETENTION = { day: 24 * HOUR, hour: HOUR } as const;
type Retention = keyof typeof RETENTION;

/** Server squash: preview what would go for a user or everyone, then apply. */
export function SquashEventLogForm({ onDone }: { onDone?: () => void }) {
  const [userId, setUserId] = useState(ALL_USERS);
  const [retention, setRetention] = useState<Retention>("day");
  const input = {
    userId: userId === ALL_USERS ? undefined : userId,
    retentionMs: RETENTION[retention],
  };

  const preview = useQuery({
    ...adminSquashPreviewQueryOptions(input),
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: async () => squashEventLogFn({ data: input }),
    onSuccess(result) {
      toast.success(`Squashed ${result.removed.toLocaleString()} events`, {
        description: `${result.scanned.toLocaleString()} scanned across ${result.users.toLocaleString()} users · ${result.reasons.superseded.toLocaleString()} replaced by a later edit · ${result.reasons.deleted.toLocaleString()} history of deleted rows`,
      });
      onDone?.();
    },
    onError(err: unknown) {
      toast.error("Squash failed", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["admin"]] },
  });

  const removable = preview.data?.removed ?? 0;

  return (
    <div className="flex flex-col gap-3" data-test="admin-squash-form">
      <AdminUserSelect value={userId} onChange={setUserId} allowAll data-test="admin-squash-user" />
      <RadioGroup
        value={retention}
        onValueChange={(value) => setRetention(value === "hour" ? "hour" : "day")}
        className="flex flex-col gap-2"
      >
        <Label className="flex items-center gap-2 font-normal">
          <RadioGroupItem value="day" data-test="admin-squash-retention-day" />
          Keep the last 24 hours
        </Label>
        <Label className="flex items-center gap-2 font-normal">
          <RadioGroupItem value="hour" data-test="admin-squash-retention-hour" />
          Keep the last hour (the minimum)
        </Label>
      </RadioGroup>
      <p className="text-sm" data-test="admin-squash-preview">
        {preview.error
          ? unwrapUnknownError(preview.error).message
          : !preview.data
            ? "Counting…"
            : removable === 0
              ? `Nothing to squash in ${preview.data.scanned.toLocaleString()} events.`
              : `${removable.toLocaleString()} of ${preview.data.scanned.toLocaleString()} events can go: ${preview.data.reasons.superseded.toLocaleString()} replaced by a later edit, ${preview.data.reasons.deleted.toLocaleString()} history of deleted rows.`}
      </p>
      <button
        type="button"
        className="btn btn-primary btn-sm self-start"
        disabled={removable === 0 || mutation.isPending || preview.isFetching}
        onClick={() => mutation.mutate()}
        data-test="admin-squash-submit"
      >
        {mutation.isPending ? "Squashing…" : `Squash ${removable.toLocaleString()} events`}
      </button>
    </div>
  );
}
