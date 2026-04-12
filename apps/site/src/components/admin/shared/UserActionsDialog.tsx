import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { authClient, userRoles } from "@/lib/better-auth/client";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Key, Loader2, Shield, Trash2, UserCog, UserMinus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RolesSelectItems } from "./roles";

interface UserActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name?: string | null;
    email: string;
    role?: string | null;
    banned?: boolean;
  };
  orgId?: string; // If provided, show org-specific actions
  onSuccess?: () => void;
}

export function UserActionsDialog({
  open,
  onOpenChange,
  user,
  orgId,
  onSuccess,
}: UserActionsDialogProps) {
  const queryClient = useQueryClient();
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [formData, setFormData] = useState({
    role: user.role || "manager",
    memberRole: "member",
    password: "",
    banReason: "",
    banExpiresIn: "",
    name: user.name || "",
    email: user.email,
  });

  // Organization mutations
  const removeMemberMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.organization.removeMember({
        memberIdOrEmail: user.email,
        organizationId: orgId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Member removed from organization");
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Failed to remove member", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const { data, error } = await authClient.organization.updateMemberRole({
        memberId: user.id,
        role: role,
        organizationId: orgId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Member role updated");
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Failed to update member role", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  // Admin mutations
  const updateUserMutation = useMutation({
    mutationFn: async (data: { name?: string; email?: string }) => {
      const { data: result, error } = await authClient.admin.updateUser({
        userId: user.id,
        data,
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Failed to update user", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const setRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const { data, error } = await authClient.admin.setRole({
        userId: user.id,
        role: role as any,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("User role updated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Failed to update role", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await authClient.admin.setUserPassword({
        userId: user.id,
        newPassword: password,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Password updated");
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Failed to update password", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ reason, expiresIn }: { reason?: string; expiresIn?: number }) => {
      const { data, error } = await authClient.admin.banUser({
        userId: user.id,
        banReason: reason,
        banExpiresIn: expiresIn,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("User banned");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Failed to ban user", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.admin.unbanUser({
        userId: user.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("User unbanned");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Failed to unban user", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.admin.removeUser({
        userId: user.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("User removed");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Failed to remove user", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const isPending =
    removeMemberMutation.isPending ||
    updateMemberRoleMutation.isPending ||
    updateUserMutation.isPending ||
    setRoleMutation.isPending ||
    setPasswordMutation.isPending ||
    banUserMutation.isPending ||
    unbanUserMutation.isPending ||
    removeUserMutation.isPending;

  const handleSubmit = () => {
    switch (selectedAction) {
      // Organization actions
      case "remove-from-org":
        removeMemberMutation.mutate();
        break;
      case "update-member-role":
        updateMemberRoleMutation.mutate(formData.memberRole);
        break;

      // Admin actions
      case "update-user":
        updateUserMutation.mutate({
          name: formData.name,
          email: formData.email,
        });
        break;
      case "set-role":
        setRoleMutation.mutate(formData.role);
        break;
      case "set-password":
        if (!formData.password) {
          toast.error("Password is required");
          return;
        }
        setPasswordMutation.mutate(formData.password);
        break;
      case "ban-user":
        banUserMutation.mutate({
          reason: formData.banReason || undefined,
          expiresIn: formData.banExpiresIn ? parseInt(formData.banExpiresIn) : undefined,
        });
        break;
      case "unban-user":
        unbanUserMutation.mutate();
        break;
      case "remove-user":
        removeUserMutation.mutate();
        break;
    }
  };

  const renderActionForm = () => {
    switch (selectedAction) {
      case "remove-from-org":
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Remove <span className="font-semibold">{user.email}</span> from this organization?
            </p>
          </div>
        );

      case "update-member-role":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberRole">Member role</Label>
              <Select
                value={formData.memberRole}
                onValueChange={(v) => setFormData({ ...formData, memberRole: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <RolesSelectItems />
              </Select>
            </div>
          </div>
        );

      case "update-user":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
        );

      case "set-role":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">System Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <RolesSelectItems />
              </Select>
            </div>
          </div>
        );

      case "set-password":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
          </div>
        );

      case "ban-user":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banReason">Ban Reason (optional)</Label>
              <Textarea
                id="banReason"
                value={formData.banReason}
                onChange={(e) => setFormData({ ...formData, banReason: e.target.value })}
                placeholder="Enter reason for ban"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banExpiresIn">Ban Duration (seconds, optional)</Label>
              <Input
                id="banExpiresIn"
                type="number"
                value={formData.banExpiresIn}
                onChange={(e) => setFormData({ ...formData, banExpiresIn: e.target.value })}
                placeholder="Leave empty for permanent ban"
              />
              <p className="text-muted-foreground text-xs">
                Examples: 3600 = 1 hour, 86400 = 1 day, 604800 = 1 week
              </p>
            </div>
          </div>
        );

      case "unban-user":
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Remove ban from <span className="font-semibold">{user.email}</span>?
            </p>
          </div>
        );

      case "remove-user":
        return (
          <div className="space-y-4">
            <p className="text-destructive text-sm">
              ⚠️ This action is permanent and will hard delete the user from the database.
            </p>
            <p className="text-muted-foreground text-sm">
              Are you sure you want to remove <span className="font-semibold">{user.email}</span>?
            </p>
          </div>
        );

      default:
        return (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Select an action to continue
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>User Actions</DialogTitle>
          <DialogDescription>Manage {user.name || user.email}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={orgId ? "organization" : "admin"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {orgId && (
              <TabsTrigger value="organization">
                <Users className="mr-2 h-4 w-4" />
                Organization
              </TabsTrigger>
            )}
            <TabsTrigger value="admin" className={orgId ? "" : "col-span-2"}>
              <Shield className="mr-2 h-4 w-4" />
              Admin
            </TabsTrigger>
          </TabsList>

          {orgId && (
            <TabsContent value="organization" className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Actions</Label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remove-from-org">
                      <div className="flex items-center">
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remove from Organization
                      </div>
                    </SelectItem>
                    <SelectItem value="update-member-role">
                      <div className="flex items-center">
                        <UserCog className="mr-2 h-4 w-4" />
                        Update Member Role
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {renderActionForm()}
            </TabsContent>
          )}

          <TabsContent value="admin" className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Actions</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="update-user">
                    <div className="flex items-center">
                      <UserCog className="mr-2 h-4 w-4" />
                      Update User Info
                    </div>
                  </SelectItem>
                  <SelectItem value="set-role">
                    <div className="flex items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      Set System Role
                    </div>
                  </SelectItem>
                  <SelectItem value="set-password">
                    <div className="flex items-center">
                      <Key className="mr-2 h-4 w-4" />
                      Set Password
                    </div>
                  </SelectItem>
                  {user.banned ? (
                    <SelectItem value="unban-user">
                      <div className="flex items-center">
                        <Ban className="mr-2 h-4 w-4" />
                        Unban User
                      </div>
                    </SelectItem>
                  ) : (
                    <SelectItem value="ban-user">
                      <div className="flex items-center">
                        <Ban className="mr-2 h-4 w-4" />
                        Ban User
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="remove-user">
                    <div className="text-destructive flex items-center">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove User (Permanent)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderActionForm()}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedAction || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedAction === "remove-user" || selectedAction === "remove-from-org"
              ? "Remove"
              : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
