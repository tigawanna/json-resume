import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPageHeader } from "@/components/wrappers/ListPageHeader";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { deleteAccount } from "@/lib/auth.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/settings/")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings", description: "Manage your account and API keys" }],
  }),
});

function SettingsPage() {
  const { viewer } = useViewer();
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

      {/* Account Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Manage your account details</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Email</p>
              <p className="mt-1 text-sm font-medium">{viewer.user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Name</p>
              <p className="mt-1 text-sm font-medium">{viewer.user?.name || "—"}</p>
            </div>
          </div>
          {viewer.user?.image && (
            <div>
              <p className="text-muted-foreground text-xs font-medium">Avatar</p>
              <img
                src={viewer.user.image}
                alt={viewer.user.name || "User avatar"}
                className="mt-2 size-16 rounded-full"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone - Delete Account */}
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
    </div>
  );
}
