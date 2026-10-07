import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminEventUsersQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { ADMIN_EVENT_TYPES } from "@/modules/admin/admin-event-filters";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import type { AdminDataSearch } from "../-utils/admin-data-search";

type EventFilterBarProps = {
  search: AdminDataSearch;
  setSearch: (next: Partial<AdminDataSearch>) => void;
  /** The by-collection view lists every collection, so it hides the collection filter. */
  showCollection?: boolean;
};

/** Radix Select items cannot have an empty value. */
const ALL = "all";

function isEventType(value: string): value is (typeof ADMIN_EVENT_TYPES)[number] {
  return ADMIN_EVENT_TYPES.some((type) => type === value);
}

export function EventFilterBar({ search, setSearch, showCollection = true }: EventFilterBarProps) {
  const [q, setQ] = useState(search.q ?? "");
  const users = useQuery(adminEventUsersQueryOptions);
  const selectedUser = search.userId
    ? users.data?.find((user) => user.userId === search.userId)
    : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch({ q: q.trim() || undefined, page: 0 });
          }}
        >
          <Input
            className="md:w-72"
            placeholder="Search email, collection or key"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            data-test="admin-events-search"
          />
          <button type="submit" className="btn btn-primary btn-sm h-9">
            Search
          </button>
        </form>

        <Select
          value={search.type ?? ALL}
          onValueChange={(value) =>
            setSearch({ type: isEventType(value) ? value : undefined, page: 0 })
          }
        >
          <SelectTrigger className="md:w-36" data-test="admin-events-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {ADMIN_EVENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={search.applied ?? ALL}
          onValueChange={(value) =>
            setSearch({
              applied: value === "yes" || value === "no" ? value : undefined,
              page: 0,
            })
          }
        >
          <SelectTrigger className="md:w-44" data-test="admin-events-applied">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Applied or waiting</SelectItem>
            <SelectItem value="yes">Applied</SelectItem>
            <SelectItem value="no">Waiting</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {search.userId ? (
          <FilterChip
            label={`User: ${selectedUser?.email ?? search.userId}`}
            onClear={() => setSearch({ userId: undefined, page: 0 })}
            dataTest="admin-events-clear-user"
          />
        ) : null}
        {search.q ? (
          <FilterChip
            label={`Matches "${search.q}"`}
            onClear={() => {
              setQ("");
              setSearch({ q: undefined, page: 0 });
            }}
            dataTest="admin-events-clear-search"
          />
        ) : null}
        {showCollection && search.collectionId ? (
          <FilterChip
            label={`Collection: ${search.collectionId}`}
            onClear={() => setSearch({ collectionId: undefined, page: 0 })}
            dataTest="admin-events-clear-collection"
          />
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  onClear,
  dataTest,
}: {
  label: string;
  onClear: () => void;
  dataTest: string;
}) {
  return (
    <Badge variant="secondary" className="gap-1 py-1">
      {label}
      <button type="button" aria-label={`Clear ${label}`} onClick={onClear} data-test={dataTest}>
        <X className="size-3" />
      </button>
    </Badge>
  );
}
