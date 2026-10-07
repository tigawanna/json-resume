import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminUsersQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { useQuery } from "@tanstack/react-query";

export const ALL_USERS = "__all__";

interface AdminUserSelectProps {
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
  "data-test"?: string;
}

/** `value` is a user id, or {@link ALL_USERS} when `allowAll` is set. */
export function AdminUserSelect({
  value,
  onChange,
  allowAll = false,
  "data-test": dataTest,
}: AdminUserSelectProps) {
  const users = useQuery(adminUsersQueryOptions);

  return (
    <Select value={value} onValueChange={onChange} disabled={!users.data}>
      <SelectTrigger className="w-full" data-test={dataTest}>
        <SelectValue placeholder={users.error ? users.error.message : "Choose a user"} />
      </SelectTrigger>
      <SelectContent>
        {allowAll ? <SelectItem value={ALL_USERS}>All users</SelectItem> : null}
        {(users.data ?? []).map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name} ({user.email}) · {user.events.toLocaleString()} events
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
