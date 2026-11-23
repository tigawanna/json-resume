import {
  creditLedgerQueryOptions,
  type CreditLedgerResponse,
} from "@/data-access-layer/credits/credits-query-options";
import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLocaleDateTime } from "@/utils/date-helpers";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

const ROUTE_ID = "/_dashboard/credits/";
const routeApi = getRouteApi(ROUTE_ID);
const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, string> = {
  monthly_grant: "Monthly grant",
  monthly_expiry: "Monthly expiry",
  admin_grant: "Bonus grant",
  admin_adjustment: "Adjustment",
  resume_spend: "Résumé created",
  resume_overdraft: "Résumé overdraft",
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function amountLabel(amount: number): string {
  if (amount === 0) return "0";
  return amount > 0 ? `+${amount}` : `${amount}`;
}

/** Append-only ledger for the viewer's wallet, newest first. */
export function CreditsLedgerList() {
  const page = routeApi.useSearch().page ?? 1;
  const query = useQuery(creditLedgerQueryOptions({ page, perPage: PAGE_SIZE }));

  return (
    <Card data-test="credits-ledger">
      <CardHeader>
        <CardTitle className="text-base">Ledger</CardTitle>
        <CardDescription>Every credit change on your account, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        <LedgerBody query={query} />
        <div className="mt-4">
          <TSRListPagination
            routeID={ROUTE_ID}
            totalPages={query.data?.pagination.totalPages ?? 0}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LedgerBody({ query }: { query: ReturnType<typeof useQuery<CreditLedgerResponse>> }) {
  if (query.isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="size-6" />
      </div>
    );
  }
  if ((query.data?.items.length ?? 0) === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No credit activity yet</EmptyTitle>
          <EmptyDescription>
            Grants, expiries, and résumé spends will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="rounded-lg border" data-test="credits-ledger-list">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Change</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Bucket</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(query.data?.items ?? []).map((row) => (
            <TableRow key={row.id} data-test="credits-ledger-row">
              <TableCell>
                <span className="text-sm">{typeLabel(row.type)}</span>
                {row.reason ? (
                  <span className="block text-xs text-muted-foreground">{row.reason}</span>
                ) : null}
              </TableCell>
              <TableCell className="font-mono text-sm">{amountLabel(row.amount)}</TableCell>
              <TableCell>
                <Badge variant={row.bucket === "bonus" ? "secondary" : "outline"}>
                  {row.bucket}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatLocaleDateTime(row.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
