import { ScanSearch } from "lucide-react";

interface ItemNotFoundProps {
  label?: string;
  icon?: React.ReactNode;
}

export function ItemNotFound({ label, icon }: ItemNotFoundProps) {
  return (
    <div className="bg-base-300 flex flex-col items-center justify-center space-y-4 rounded-2xl p-8 text-center shadow-sm">
      {icon ?? <ScanSearch className="text-muted-foreground h-16 w-16" />}
      <h2 className="text-2xl font-bold tracking-tight">No {label || "items"} found</h2>
      <p className="text-muted-foreground max-w-sm">
        We couldn't find any {label || "items"} matching your search. Try adjusting your filters or
        search terms.
      </p>
    </div>
  );
}
