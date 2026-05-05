import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { authClient } from "@/lib/better-auth/client";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PermissionLevel = "read" | "write";

const PERMISSION_ITEMS: { label: string; description: string; value: PermissionLevel }[] = [
  {
    label: "Read only",
    description: "List resumes, read documents, and search blocks",
    value: "read",
  },
  {
    label: "Read & Write",
    description: "All read permissions plus create and modify resumes",
    value: "write",
  },
];

const createOpts = formOptions({
  defaultValues: { name: "", permission: "read" as PermissionLevel },
});

interface ApiKeyCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: string) => void;
}

export function ApiKeyCreateDialog({ open, onOpenChange, onCreated }: ApiKeyCreateDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: typeof createOpts.defaultValues) => {
      const permissions: Record<string, string[]> =
        values.permission === "write" ? { resumes: ["read", "write"] } : { resumes: ["read"] };

      const { data, error } = await authClient.apiKey.create({
        name: values.name,
        permissions,
      });

      if (error) throw new Error(error.message);
      if (!data?.key) throw new Error("No key returned from server");

      return data.key;
    },
    onSuccess(key) {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.apiKeys] });
      onOpenChange(false);
      onCreated(key);
    },
    onError(err: unknown) {
      toast.error("Failed to create API key", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  function handleOpenChange(open: boolean) {
    if (!open) form.reset();
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-test="create-api-key-dialog">
        <DialogHeader>
          <DialogTitle>New API Key</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-5"
        >
          <form.AppField
            name="name"
            validators={{
              onChange: ({ value }) => (!value?.trim() ? "Name is required" : undefined),
            }}
          >
            {(field) => (
              <field.TextField
                label="Key name"
                placeholder="e.g. My AI Agent"
                data-test="api-key-name-input"
              />
            )}
          </form.AppField>

          <form.AppField name="permission">
            {(field) => <field.RadioGroupField label="Permissions" items={PERMISSION_ITEMS} />}
          </form.AppField>

          <form.Subscribe selector={(s) => ({ values: s.values, isPending: mutation.isPending })}>
            {({ values, isPending }) => (
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending || !values.name.trim()}
                  data-test="create-api-key-submit"
                >
                  {isPending ? "Creating…" : "Create key"}
                </Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
