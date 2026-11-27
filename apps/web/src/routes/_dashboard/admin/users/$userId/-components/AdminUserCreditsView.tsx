import {
  adminUserCreditsQueryOptions,
  adminUserWalletQueryOptions,
} from "@/data-access-layer/credits/credits-query-options";
import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { AdminPageHeader } from "../../../-components/AdminPageHeader";
import { AdminAdjustForm } from "./AdminAdjustForm";
import { AdminGrantForm } from "./AdminGrantForm";
import { AdminUserLedger } from "./AdminUserLedger";

const ROUTE_ID = "/_dashboard/admin/users/$userId/";
const routeApi = getRouteApi(ROUTE_ID);
const PAGE_SIZE = 20;

/** One user's credit wallet, ledger, and the admin grant/adjust actions. */
export function AdminUserCreditsView() {
  const { userId } = routeApi.useParams();
  const page = routeApi.useSearch().page ?? 1;

  const walletQuery = useQuery(adminUserWalletQueryOptions({ userId }));
  const ledgerQuery = useQuery(adminUserCreditsQueryOptions({ userId, page, perPage: PAGE_SIZE }));
  const data = walletQuery.data;
  const ledger = ledgerQuery.data;
  const isPending = walletQuery.isPending || ledgerQuery.isPending;
  const error = walletQuery.error ?? ledgerQuery.error;

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6" data-test="admin-user-credits-missing">
        <AdminPageHeader title="User credits" description="Could not load this user's credits." />
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-6" data-test="admin-user-credits">
      <AdminPageHeader
        title={`${data.user.name} · credits`}
        description={data.user.email}
        backTo="/admin"
      />

      <WalletSummary monthly={data.wallet.monthlyBalance} bonus={data.wallet.bonusBalance} />

      <div className="grid gap-6 px-4 md:grid-cols-2 md:px-6">
        <AdminGrantForm userId={userId} />
        <AdminAdjustForm userId={userId} />
      </div>

      <div className="px-4 md:px-6">
        <AdminUserLedger items={ledger?.items ?? []} />
      </div>
      <div className="px-4 md:px-6">
        <TSRListPagination routeID={ROUTE_ID} totalPages={ledger?.pagination.totalPages ?? 1} />
      </div>
    </div>
  );
}

function WalletSummary({ monthly, bonus }: { monthly: number; bonus: number }) {
  return (
    <div className="flex flex-wrap gap-4 px-4 md:px-6" data-test="admin-user-wallet">
      <Card className="min-w-48 flex-1">
        <CardHeader>
          <CardDescription>Monthly</CardDescription>
          <CardTitle className="text-3xl">{monthly}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="min-w-48 flex-1">
        <CardHeader>
          <CardDescription>Bonus (carries over)</CardDescription>
          <CardTitle className="text-3xl">{bonus}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
