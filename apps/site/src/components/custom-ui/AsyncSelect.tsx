import { useDebouncedValue } from "@/hooks/use-debouncer";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
}

export interface AsyncSelectProps<T> {
  /** TanStack Query options for fetching options */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryOptions: UseQueryOptions<T[], Error, T[], any>;
  /** Preload all data ahead of time */
  preload?: boolean;
  /** Function to filter options */
  filterFn?: (option: T, query: string) => boolean;
  /** Function to render each option */
  renderOption: (option: T) => React.ReactNode;
  /** Function to get the value from an option */
  getOptionValue: (option: T) => string;
  /** Function to get the display value for the selected option */
  getDisplayValue: (option: T) => React.ReactNode;
  /** Custom not found message */
  notFound?: React.ReactNode;
  /** Custom loading skeleton */
  loadingSkeleton?: React.ReactNode;
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Label for the select field */
  label: string;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Disable the entire select */
  disabled?: boolean;
  /** Custom width for the popover */
  width?: string | number;
  /** Custom class names */
  className?: string;
  /** Custom trigger button class names */
  triggerClassName?: string;
  /** Custom no results message */
  noResultsMessage?: string;
  /** Allow clearing the selection */
  clearable?: boolean;
}

/**
 * AsyncSelect component that integrates with TanStack Query
 *
 * Supports both local and server-side filtering:
 * - Local filtering: Always applied if `filterFn` is provided
 * - Server-side filtering: Triggered by passing search term in queryKey
 *
 * @example
 * ```tsx
 * interface User {
 *   id: string;
 *   name: string;
 * }
 *
 * // Basic usage with local filtering
 * const usersQueryOptions = queryOptions({
 *   queryKey: ["users"],
 *   queryFn: async () => {
 *     const res = await fetch("/api/users");
 *     return res.json();
 *   },
 * });
 *
 * export function MyComponent() {
 *   const [selectedId, setSelectedId] = useState("");
 *
 *   return (
 *     <AsyncSelect<User>
 *       queryOptions={usersQueryOptions}
 *       filterFn={(user, query) =>
 *         user.name.toLowerCase().includes(query.toLowerCase())
 *       }
 *       renderOption={(user) => <span>{user.name}</span>}
 *       getOptionValue={(user) => user.id}
 *       getDisplayValue={(user) => user.name}
 *       value={selectedId}
 *       onChange={setSelectedId}
 *       label="Users"
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: With server-side filtering (queryFn reads search term from queryKey)
 * const usersQueryOptions = queryOptions({
 *   queryKey: ["users"],
 *   queryFn: async ({ queryKey }) => {
 * // get the last element as search term
 *     const searchTerm = queryKey.at(-1) as string | undefined;
 *     const params = new URLSearchParams();
 *     if (searchTerm) params.append("search", searchTerm);
 *
 *     const res = await fetch(`/api/users?${params}`);
 *     return res.json();
 *   },
 * });
 * ```
 */
export function AsyncSelect<T>({
  queryOptions,
  preload,
  filterFn,
  renderOption,
  getOptionValue,
  getDisplayValue,
  notFound,
  loadingSkeleton,
  label,
  placeholder = "Select...",
  value,
  onChange,
  disabled = false,
  width = "200px",
  className,
  triggerClassName,
  noResultsMessage,
  clearable = true,
}: AsyncSelectProps<T>) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { debouncedValue: debouncedSearchTerm } = useDebouncedValue(searchTerm, preload ? 0 : 300);
  const [selectedValue, setSelectedValue] = useState(value);
  const [selectedOption, setSelectedOption] = useState<T | null>(null);
  const [filteredOptions, setFilteredOptions] = useState<T[]>([]);

  // Use TanStack Query with provided query options
  // For API-based filtering, pass search term in queryKey if supported
  const queryKeyWithSearch = Array.isArray(queryOptions.queryKey)
    ? [...queryOptions.queryKey, ...(debouncedSearchTerm ? [debouncedSearchTerm] : [])]
    : queryOptions.queryKey;

  const {
    data: options = [] as T[],
    isLoading,
    error,
  } = useQuery({
    ...queryOptions,
    queryKey: queryKeyWithSearch,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as { data: T[]; isLoading: boolean; error: Error | null };

  useEffect(() => {
    setMounted(true);
    setSelectedValue(value);
  }, [value]);

  // Initialize selectedOption when options are loaded and value exists
  useEffect(() => {
    if (value && options.length > 0) {
      const option = options.find((opt) => getOptionValue(opt) === value);
      if (option) {
        setSelectedOption(option);
      }
    }
  }, [value, options, getOptionValue]);

  // Filter options based on search term
  // First apply local filter, then optionally trigger API filter
  useEffect(() => {
    if (!mounted) return;

    // Always apply local filtering if available
    let filtered = options;
    if (debouncedSearchTerm && filterFn) {
      filtered = options.filter((option) => filterFn(option, debouncedSearchTerm));
    }
    setFilteredOptions(filtered);
  }, [options, debouncedSearchTerm, filterFn, mounted]);

  const handleSelect = useCallback(
    (currentValue: string) => {
      const newValue = clearable && currentValue === selectedValue ? "" : currentValue;
      setSelectedValue(newValue);
      setSelectedOption(
        filteredOptions.find((option) => getOptionValue(option) === newValue) || null,
      );
      onChange(newValue);
      setOpen(false);
    },
    [selectedValue, onChange, clearable, filteredOptions, getOptionValue],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between",
            disabled && "cursor-not-allowed opacity-50",
            triggerClassName,
          )}
          style={{ width: width }}
          disabled={disabled}
        >
          {selectedOption ? getDisplayValue(selectedOption) : placeholder}
          <ChevronsUpDown className="opacity-50" size={10} />
        </Button>
      </PopoverTrigger>
      <PopoverContent style={{ width: width }} className={cn("p-0", className)}>
        <Command shouldFilter={false}>
          <div className="relative w-full border-b">
            <CommandInput
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onValueChange={(value) => {
                setSearchTerm(value);
              }}
            />
            {isLoading && filteredOptions.length > 0 && (
              <div className="absolute top-1/2 right-2 flex -translate-y-1/2 transform items-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
          <CommandList>
            {error && (
              <div className="text-destructive p-4 text-center">
                {error instanceof Error ? error.message : "Failed to fetch options"}
              </div>
            )}
            {isLoading &&
              filteredOptions.length === 0 &&
              (loadingSkeleton || <DefaultLoadingSkeleton />)}
            {!isLoading &&
              !error &&
              filteredOptions.length === 0 &&
              (notFound || (
                <CommandEmpty>
                  {noResultsMessage ?? `No ${label.toLowerCase()} found.`}
                </CommandEmpty>
              ))}
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={getOptionValue(option)}
                  value={getOptionValue(option)}
                  onSelect={handleSelect}
                >
                  {renderOption(option)}
                  <Check
                    className={cn(
                      "ml-auto h-3 w-3",
                      selectedValue === getOptionValue(option) ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DefaultLoadingSkeleton() {
  return (
    <CommandGroup>
      {[1, 2, 3].map((i) => (
        <CommandItem key={i} disabled>
          <div className="flex w-full items-center gap-2">
            <div className="bg-muted h-6 w-6 animate-pulse rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <div className="bg-muted h-4 w-24 animate-pulse rounded" />
              <div className="bg-muted h-3 w-16 animate-pulse rounded" />
            </div>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
