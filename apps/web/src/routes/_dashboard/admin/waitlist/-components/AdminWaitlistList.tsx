import { adminWaitlistQueryOptions } from "@/data-access-layer/waitlist/waitlist-query-options";
import { clientEnv } from "@/lib/env/client-env";
import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { SearchBox } from "@/components/search/SearchBox";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { AdminPageHeader } from "../../-components/AdminPageHeader";
import { WaitlistListBody } from "./WaitlistListBody";

const ROUTE_ID = "/_dashboard/admin/waitlist/";
const routeApi = getRouteApi(ROUTE_ID);

export function AdminWaitlistList() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);

  const q = search.q ?? "";
  const page = search.page ?? 1;

  const { data, isPending } = useQuery(
    adminWaitlistQueryOptions({
      page,
      perPage: ADMIN_LIST_PER_PAGE,
      q: q.trim() || undefined,
      status: search.status,
      hasAccount: search.hasAccount,
    }),
  );

  const hasFilters = Boolean(q || search.status || search.hasAccount);
  const items = data?.items ?? [];

  function patchSearch(patch: { status?: "joined" | "removed"; hasAccount?: "true" | "false" }) {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
        page: undefined,
      }),
    });
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-6">
      <AdminPageHeader
        title="Waitlist"
        description="People who asked for early access. Linked accounts are matched by email."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchBox
            keyword={inputValue}
            setKeyword={(value) => onSearchChange(value)}
            isDebouncing={isDebouncing}
            dataTest="waitlist-search-input"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusFilter value={search.status} onChange={(status) => patchSearch({ status })} />
          <AccountFilter
            value={search.hasAccount}
            onChange={(hasAccount) => patchSearch({ hasAccount })}
          />
          <Button type="button" variant="outline" size="sm" asChild data-test="waitlist-export">
            <a href={`${clientEnv.VITE_HONO_API_URL}/api/admin/waitlist/export`}>Export CSV</a>
          </Button>
        </div>
      </div>

      <WaitlistListBody
        isPending={isPending}
        itemsEmpty={!isPending && items.length === 0}
        items={items}
        hasFilters={hasFilters}
        clearSearch={clearSearch}
      />

      <TSRListPagination routeID={ROUTE_ID} totalPages={data?.pagination.totalPages ?? 0} />
    </div>
  );
}

function StatusFilter({
  value,
  onChange,
}: {
  value: "joined" | "removed" | undefined;
  onChange: (status: "joined" | "removed" | undefined) => void;
}) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(next) => onChange(next === "joined" || next === "removed" ? next : undefined)}
    >
      <SelectTrigger className="w-32" data-test="waitlist-status-filter">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="joined">Joined</SelectItem>
        <SelectItem value="removed">Removed</SelectItem>
      </SelectContent>
    </Select>
  );
}

function AccountFilter({
  value,
  onChange,
}: {
  value: "true" | "false" | undefined;
  onChange: (hasAccount: "true" | "false" | undefined) => void;
}) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(next) => onChange(next === "true" || next === "false" ? next : undefined)}
    >
      <SelectTrigger className="w-36" data-test="waitlist-account-filter">
        <SelectValue placeholder="Account" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All entries</SelectItem>
        <SelectItem value="true">With account</SelectItem>
        <SelectItem value="false">Without account</SelectItem>
      </SelectContent>
    </Select>
  );
}
