import { type AdminWaitlistEntry } from "@/data-access-layer/waitlist/waitlist-query-options";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WaitlistRow } from "./WaitlistRow";

/** Loading, empty, and table states for the admin waitlist page. */
export function WaitlistListBody(input: {
  isPending: boolean;
  itemsEmpty: boolean;
  items: AdminWaitlistEntry[];
  hasFilters: boolean;
  clearSearch: () => void;
}) {
  if (input.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (input.itemsEmpty) {
    return input.hasFilters ? <FilteredEmpty onClear={input.clearSearch} /> : <WaitlistEmpty />;
  }

  return (
    <div className="rounded-lg border" data-test="waitlist-list">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {input.items.map((entry) => (
            <WaitlistRow key={entry.id} entry={entry} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FilteredEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div data-test="waitlist-search-empty">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No matching entries</EmptyTitle>
          <EmptyDescription>Try a different search or clear the filters.</EmptyDescription>
        </EmptyHeader>
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          Clear search
        </Button>
      </Empty>
    </div>
  );
}

function WaitlistEmpty() {
  return (
    <div data-test="waitlist-empty">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>The waitlist is empty</EmptyTitle>
          <EmptyDescription>
            Entries appear here when someone joins from the landing page or /waitlist.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
