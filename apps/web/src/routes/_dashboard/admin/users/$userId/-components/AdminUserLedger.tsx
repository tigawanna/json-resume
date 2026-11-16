import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatLocaleDateTime } from "@/utils/date-helpers";
import { ledgerAmountLabel, ledgerTypeLabel, type LedgerRow } from "./ledger-labels";

/** Every balance change for one user, newest first. */
export function AdminUserLedger({ items }: { items: LedgerRow[] }) {
  return (
    <Card data-test="admin-user-ledger">
      <CardHeader>
        <CardTitle className="text-base">Ledger</CardTitle>
        <CardDescription>Every balance change, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credit activity yet.</p>
        ) : (
          <div className="rounded-lg border">
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
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="text-sm">{ledgerTypeLabel(row.type)}</span>
                      {row.reason ? (
                        <span className="block text-xs text-muted-foreground">{row.reason}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {ledgerAmountLabel(row.amount)}
                    </TableCell>
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
        )}
      </CardContent>
    </Card>
  );
}
