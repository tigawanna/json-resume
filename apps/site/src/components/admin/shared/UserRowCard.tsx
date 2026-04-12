import { RoleIcons } from "@/components/identity/RoleIcons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BetterAuthUserRoles } from "@/lib/better-auth/client";
import { getRelativeTimeString } from "@/utils/date-helpers";
import { Settings } from "lucide-react";
import { ReactNode, useState } from "react";
import { UserActionsDialog } from "./UserActionsDialog";

interface UserRowCardProps {
  user: {
    id: string;
    name?: string | null;
    email: string;
    role?: string | null;
    emailVerified?: boolean;
    banned?: boolean;
    createdAt?: Date | string | null;
  };
  orgId?: string; // When provided, shows org-specific actions
  showActions?: boolean;
  showEmail?: boolean;
  extraBadges?: ReactNode;
  onSuccess?: () => void;
}

export function UserRowCard({
  user,
  orgId,
  showActions = false,
  showEmail = true,
  extraBadges,
  onSuccess,
}: UserRowCardProps) {
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <>
      <Card className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0">
                <RoleIcons role={(user.role as BetterAuthUserRoles) ?? "manager"} />
              </div>
              <CardTitle className="truncate text-base">{user.name ?? "—"}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 overflow-hidden">
          {showEmail !== false && (
            <div className="max-w-full overflow-hidden">
              <p className="text-muted-foreground mb-1 text-xs">Email</p>
              <p className="truncate text-sm wrap-break-word">{user.email}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground mb-2 text-xs">Status</p>
            <div className="flex flex-wrap gap-2">
              {user.emailVerified ? (
                <Badge variant="outline">Verified</Badge>
              ) : (
                <Badge variant="secondary">Unverified</Badge>
              )}
              {user.banned ? <Badge variant="destructive">Banned</Badge> : null}
              {user.role ? <Badge variant="outline">{user.role}</Badge> : null}
              {extraBadges}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Created</p>
            <p className="text-sm" title={String(user.createdAt ?? "")}>
              {user.createdAt ? getRelativeTimeString(new Date(user.createdAt)) : "—"}
            </p>
          </div>
          {showActions && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setActionsOpen(true)}
            >
              <Settings className="mr-1 h-4 w-4" />
              Manage User
            </Button>
          )}
        </CardContent>
      </Card>

      <UserActionsDialog
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        user={user}
        orgId={orgId}
        onSuccess={onSuccess}
      />
    </>
  );
}
