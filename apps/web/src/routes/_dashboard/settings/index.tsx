import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPageHeader } from "@/components/wrappers/ListPageHeader";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { deleteAccount } from "@/lib/auth.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AiAssistantSection } from "./-components/AiAssistantSection";
import { LocalBackupSection } from "./-components/LocalBackupSection";
import { ManagedSyncSection } from "./-components/ManagedSyncSection";

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
      // The user will be logged out and redirected by the server
      window.location.href = "/";
    },
    onError(err: unknown) {
      toast.error("Failed to delete account", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  return (
    <div className="flex flex-col gap-8" data-test="settings-page">
      <ListPageHeader title="Settings" />

      {isAuthenticated ? (
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Manage your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
              {viewer.user?.image ? (
                <img
                  src={viewer.user.image}
                  alt=""
                  className="size-24 shrink-0 rounded-full object-cover ring-2 ring-border ring-offset-2 ring-offset-card sm:size-28"
                />
              ) : (
                <div
                  aria-hidden
                  className="bg-muted text-muted-foreground flex size-24 shrink-0 items-center justify-center rounded-full text-2xl font-semibold ring-2 ring-border ring-offset-2 ring-offset-card sm:size-28"
                >
                  {(viewer.user?.name ?? viewer.user?.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Name
                  </dt>
                  <dd className="mt-1 truncate text-base font-medium">
                    {viewer.user?.name || "—"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Email
                  </dt>
                  <dd className="mt-1 truncate text-base font-medium">
                    {viewer.user?.email || "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card data-test="settings-signed-out">
          <CardHeader>
            <CardTitle>Working on this computer</CardTitle>
            <CardDescription>
              You are not signed in. Local backup still works. Sign in to sync and manage an
              account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/auth" search={{ returnTo: "/settings" }}>
                Sign in to sync
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <AiAssistantSection />

      <ManagedSyncSection />

      <LocalBackupSection />

      {isAuthenticated ? (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" />
              <div>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h3 className="font-medium">Delete Account</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Once you delete your account, there is no going back. All your resumes and data will
                be permanently deleted. This action cannot be undone.
              </p>
            </div>

            {!showDeleteConfirm ? (
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 size-4" /> Delete Account
              </Button>
            ) : (
              <div className="flex flex-col gap-3 rounded-md border border-destructive bg-destructive/5 p-4">
                <p className="font-medium text-sm">
                  Are you sure? This will delete your account and all your data.
                </p>
                <div className="flex gap-2">
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
