import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

export type SortField = "updated" | "stars" | "name" | "created";
export type ForkFilter = "all" | "source" | "fork";

interface RepoFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortField: SortField;
  onSortChange: (value: SortField) => void;
  forkFilter: ForkFilter;
  onForkFilterChange: (value: ForkFilter) => void;
  totalCount: number;
  filteredCount: number;
}

export default function RepoFilters({
  search,
  onSearchChange,
  sortField,
  onSortChange,
  forkFilter,
  onForkFilterChange,
  totalCount,
  filteredCount,
}: RepoFiltersProps) {
  return (
    <div className="flex flex-col gap-3" data-test="repo-filters">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-test="repo-search"
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort */}
        <Select value={sortField} onValueChange={(v) => onSortChange(v as SortField)}>
          <SelectTrigger data-test="repo-sort" className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="stars">Most stars</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
            <SelectItem value="created">Newest first</SelectItem>
          </SelectContent>
        </Select>

        {/* Fork filter */}
        <Select value={forkFilter} onValueChange={(v) => onForkFilterChange(v as ForkFilter)}>
          <SelectTrigger data-test="repo-fork-filter" className="w-35">
            <SelectValue placeholder="Fork filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="source">Sources only</SelectItem>
            <SelectItem value="all">All repos</SelectItem>
            <SelectItem value="fork">Forks only</SelectItem>
          </SelectContent>
        </Select>

        {/* Count */}
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredCount === totalCount
            ? `${totalCount} repositories`
            : `${filteredCount} of ${totalCount} repositories`}
        </span>
      </div>
    </div>
  );
}
