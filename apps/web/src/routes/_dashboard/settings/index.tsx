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
import { Button } from "@/components/ui/button";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { honoClient } from "@/lib/hono/client";
import { parseApiError } from "@/lib/hono/parse-api-error";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Building2, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AiAssistantSection } from "./-components/AiAssistantSection";
import { LocalBackupSection } from "./-components/LocalBackupSection";
import { ManagedSyncSection } from "./-components/ManagedSyncSection";
import { SettingsSection } from "./-components/SettingsSection";

export const Route = createFileRoute("/_dashboard/settings/")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings", description: "Manage your account and local data" }],
  }),
});

function SettingsPage() {
  const { viewer } = useViewer();
  const isAuthenticated = Boolean(viewer.user?.id);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.user?.id) throw new Error("User ID not found");
      const response = await honoClient.api.me.$delete();
      if (!response.ok) {
        throw await parseApiError(response, "Failed to delete account");
      }
    },
    onSuccess() {
      toast.success("Account deleted successfully");
      window.location.href = "/";
    },
    onError(err: unknown) {
      toast.error("Failed to delete account", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6" data-test="settings-page">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Account, AI, sync, and local backup for this workspace.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl bg-base-100 ring-1 ring-base-content/10">
        {isAuthenticated ? (
          <SettingsSection
            icon={Building2}
            title="Account"
            description="Name, plan, and this sign-in."
            testId="settings-account-section"
          >
            <Link
              to="/profile"
              className="group flex items-center gap-4 rounded-lg bg-base-200/40 px-4 py-3 ring-1 ring-base-content/10 transition-colors hover:bg-base-200 focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]"
              data-test="settings-account-link"
            >
              {viewer.user?.image ? (
                <img
                  src={viewer.user.image}
                  alt=""
                  className="size-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  aria-hidden
                  className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold"
                >
                  {(viewer.user?.name ?? viewer.user?.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {viewer.user?.name || "—"}
                </span>
                <span className="text-muted-foreground block truncate text-sm">
                  {viewer.user?.email || "—"}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
                  {viewer.user?.role === "admin" ? "Admin" : "Free"} ·{" "}
                  {viewer.user?.emailVerified ? "Email verified" : "Email not verified"}
                </span>
              </span>
              <ChevronRight
                className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </SettingsSection>
        ) : (
          <SettingsSection
            icon={Building2}
            title="This computer"
            description="Work stays on this computer until you sign in."
            testId="settings-signed-out"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">Not signed in</p>
                <p className="text-muted-foreground mt-1 max-w-md text-sm leading-relaxed">
                  Resumes and edits stay in this browser until you enable sync.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-fit shrink-0">
                <Link to="/auth" search={{ returnTo: "/settings" }}>
                  Sign in to sync
                </Link>
              </Button>
            </div>
          </SettingsSection>
        )}

        <AiAssistantSection />
        <ManagedSyncSection />
        <LocalBackupSection />

        {isAuthenticated ? (
          <SettingsSection
            icon={AlertCircle}
            title="Delete account"
            description="Removes the account and every résumé stored with it. This cannot be undone."
            tone="destructive"
            testId="settings-danger-section"
          >
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" data-test="settings-delete-account-btn">
                  <Trash2 className="size-4" /> Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the account and every résumé stored with it. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel size="sm" variant="outline">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    size="sm"
                    disabled={deleteAccountMutation.isPending}
                    onClick={() => deleteAccountMutation.mutate()}
                  >
                    {deleteAccountMutation.isPending ? "Deleting…" : "Yes, delete my account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SettingsSection>
        ) : null}
      </div>
    </div>
  );
}
