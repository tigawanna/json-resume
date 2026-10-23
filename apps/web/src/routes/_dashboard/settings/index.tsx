import { Button } from "@/components/ui/button";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { deleteAccount } from "@/lib/better-auth/auth.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Building2, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.user?.id) throw new Error("User ID not found");
      await deleteAccount({ data: { userId: viewer.user.id } });
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
    <div
      className="bg-base-100 mx-auto flex w-full max-w-5xl shrink-0 flex-col overflow-hidden rounded-2xl border shadow-sm"
      data-test="settings-page"
    >
      <header className="relative flex min-h-14 items-center border-b px-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard" aria-label="Back to dashboard">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="pointer-events-none absolute inset-x-0 text-center text-sm font-semibold">
          Settings
        </h1>
      </header>
      <div className="@container flex flex-col gap-14 px-5 py-10 sm:px-8">
        {isAuthenticated ? (
          <SettingsSection
            icon={Building2}
            title="Account"
            description="Name, plan, and this sign-in."
            testId="settings-account-section"
          >
            <Link
              to="/profile"
              className="hover:bg-base-100 focus-visible:ring-ring/50 flex items-center gap-4 rounded-lg border bg-base-100 px-3 py-3 transition-colors outline-none focus-visible:ring-[3px]"
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
              <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
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
              <Link
                to="/auth"
                search={{ returnTo: "/settings" }}
                className="text-primary w-fit shrink-0 text-sm font-medium underline-offset-4 hover:underline"
              >
                Sign in to sync
              </Link>
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
            {!showDeleteConfirm ? (
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 size-4" /> Delete account
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">Delete this account and all of its data?</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteAccountMutation.mutate()}
                    disabled={deleteAccountMutation.isPending}
                  >
                    {deleteAccountMutation.isPending ? "Deleting..." : "Yes, delete my account"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteAccountMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </SettingsSection>
        ) : null}
      </div>
    </div>
  );
}
