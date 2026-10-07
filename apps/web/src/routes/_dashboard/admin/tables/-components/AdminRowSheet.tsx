import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminRowQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { useAppForm } from "@/lib/tanstack/form";
import {
  deleteAdminRowFn,
  updateAdminRowFn,
  type getAdminRow,
} from "@/modules/admin/admin.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AdminRowSheetProps = {
  table: string;
  rowid: number | null;
  onClose: () => void;
};

export function AdminRowSheet({ table, rowid, onClose }: AdminRowSheetProps) {
  return (
    <Sheet open={rowid !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl" data-test="admin-row-sheet">
        <SheetHeader>
          <SheetTitle className="font-mono">
            {table} · row {rowid}
          </SheetTitle>
          <SheetDescription>Inspect, edit, or delete this row.</SheetDescription>
        </SheetHeader>
        {rowid !== null ? (
          <AdminRowBody key={rowid} table={table} rowid={rowid} onDone={onClose} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

const modeCopy = {
  synced: {
    label: "Synced",
    description:
      "This table is built from the sync event log. Saving or deleting also writes a sync event, so the owner's devices pick up the change on their next sync.",
  },
  direct: {
    label: "Direct",
    description: "This table is not synced to devices. Changes are written straight to the row.",
  },
  readonly: {
    label: "Read-only",
    description: "Sync bookkeeping. Editing it would break sync, so it is view-only.",
  },
} as const;

function AdminRowBody({
  table,
  rowid,
  onDone,
}: {
  table: string;
  rowid: number;
  onDone: () => void;
}) {
  const query = useQuery(adminRowQueryOptions({ table, rowid }));

  if (query.error) {
    return <p className="px-4 text-sm text-error">{query.error.message}</p>;
  }
  if (!query.data) {
    return <p className="px-4 text-sm text-base-content/60">Loading row…</p>;
  }
  return <AdminRowEditor row={query.data} onDone={onDone} />;
}

type LoadedRow = Awaited<ReturnType<typeof getAdminRow>>;

function AdminRowEditor({ row, onDone }: { row: LoadedRow; onDone: () => void }) {
  const editable = row.fields.filter((field) => field.editable);
  const locked = row.fields.filter((field) => !field.editable);
  const initial: Record<string, string> = {};
  for (const field of editable)
    initial[field.name] = field.value == null ? "" : String(field.value);
  const initialNulls = editable.filter((field) => field.value == null).map((field) => field.name);
  const [nulls, setNulls] = useState<string[]>(initialNulls);
  const isNull = (name: string) => nulls.includes(name);
  const toggleNull = (name: string) =>
    setNulls((current) =>
      current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name],
    );

  const updateMutation = useMutation({
    mutationFn: async (values: Record<string, string | null>) =>
      updateAdminRowFn({ data: { table: row.table, rowid: row.rowid, values } }),
    onSuccess(result) {
      toast.success(result.changed === 0 ? "Nothing changed" : "Row updated", {
        description:
          result.mode === "synced" && result.changed > 0
            ? "A sync event was written for the owner's devices."
            : undefined,
      });
      onDone();
    },
    onError(err: unknown) {
      toast.error("Failed to update row", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["admin"]] },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteAdminRowFn({ data: { table: row.table, rowid: row.rowid } }),
    onSuccess(result) {
      toast.success("Row deleted", {
        description:
          result.mode === "synced"
            ? "A delete event was written for the owner's devices."
            : undefined,
      });
      onDone();
    },
    onError(err: unknown) {
      toast.error("Failed to delete row", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["admin"]] },
  });

  const form = useAppForm({
    defaultValues: initial,
    onSubmit: async ({ value }) => {
      const changes: Record<string, string | null> = {};
      for (const field of editable) {
        const wasNull = initialNulls.includes(field.name);
        if (isNull(field.name)) {
          if (!wasNull) changes[field.name] = null;
          continue;
        }
        const next = value[field.name] ?? "";
        if (!wasNull && next === initial[field.name]) continue;
        changes[field.name] = next;
      }
      await updateMutation.mutateAsync(changes);
    },
  });

  const mode = modeCopy[row.mode];

  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <div className="flex flex-col gap-2 rounded-lg border border-base-300 bg-base-200 p-3 text-sm">
        <Badge variant={row.mode === "synced" ? "default" : "secondary"} className="self-start">
          {mode.label}
        </Badge>
        <p className="text-base-content/70">{mode.description}</p>
      </div>

      {editable.length > 0 ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          data-test="admin-row-form"
        >
          <form.AppForm>
            {editable.map((field) => {
              const text = field.value == null ? "" : String(field.value);
              const long = text.length > 80 || text.includes("\n") || /^[[{]/.test(text);
              const description = field.type || "ANY";
              const nullToggle = field.notNull ? null : (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs self-start"
                  onClick={() => toggleNull(field.name)}
                  data-test={`admin-row-null-${field.name}`}
                >
                  {isNull(field.name) ? "Set a value" : "Set NULL"}
                </button>
              );
              if (isNull(field.name)) {
                return (
                  <div key={field.name} className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{field.name}</span>
                    <span className="font-mono text-xs text-base-content/60">
                      NULL · {description}
                    </span>
                    {nullToggle}
                  </div>
                );
              }
              return (
                <div key={field.name} className="flex flex-col gap-1">
                  <form.AppField name={field.name}>
                    {(f) =>
                      long ? (
                        <f.TextAreaField
                          label={field.name}
                          description={description}
                          className="font-mono"
                        />
                      ) : (
                        <f.TextField label={field.name} description={description} />
                      )
                    }
                  </form.AppField>
                  {nullToggle}
                </div>
              );
            })}
            <form.SubmitButton label="Save changes" className="self-start" />
          </form.AppForm>
        </form>
      ) : null}

      {locked.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Not editable</h3>
          <dl className="flex flex-col gap-2 text-sm">
            {locked.map((field) => (
              <div key={field.name} className="flex flex-col gap-0.5" data-test="admin-row-locked">
                <dt className="flex items-center gap-1 font-mono text-xs text-base-content/60">
                  {field.primaryKey ? <KeyRound className="size-3" /> : <Lock className="size-3" />}
                  {field.name}
                </dt>
                <dd className="break-all font-mono text-xs">
                  {field.kind === "secret"
                    ? "••••••"
                    : field.value == null
                      ? "NULL"
                      : String(field.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {row.mode !== "readonly" ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="btn btn-error btn-sm self-start"
              disabled={deleteMutation.isPending}
              data-test="admin-row-delete"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete row"}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this {row.table} row?</AlertDialogTitle>
              <AlertDialogDescription>
                {row.mode === "synced"
                  ? "The row is removed and a delete event is written, so it also disappears from the owner's devices."
                  : "The row is removed permanently."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                data-test="admin-row-delete-confirm"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
