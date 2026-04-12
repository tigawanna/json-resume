import { SelectContent, SelectItem } from "@/components/ui/select";
import { authClient, userRoles } from "@/lib/better-auth/client";

export function excludeRoles(role?: string | null) {
  switch (role) {
    case "owner":
      return userRoles;
    default:
      return userRoles.filter((r) => r !== "owner");
  }
}
export function RolesSelectItems() {
  const { data, isPending } = authClient.useSession();
  const refinedUserRoles = excludeRoles(data?.user?.role);
  if (isPending) {
    return <div className="skeleton h-12 w-32"></div>;
  }
  return (
    <SelectContent>
      {refinedUserRoles.map((role) => (
        <SelectItem key={role} value={role}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </SelectItem>
      ))}
    </SelectContent>
  );
}
