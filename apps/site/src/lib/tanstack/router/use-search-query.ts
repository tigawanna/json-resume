import { useDebouncedValue } from "@/hooks/use-debouncer";
import { type NavigateOptions } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useTransition } from "react";

interface UseTSRSearchQueryProps<TSearch extends Record<string, any>> {
  search: TSearch; // Search params from useSearch()
  navigate: (opts: NavigateOptions<any>) => void; // Navigate function from useNavigate()
  query_param: keyof TSearch; // defaults to "sq"
  default_value?: string;
  debounce_delay?: number; // defaults to 2000ms
}

/**
 * Generic search query hook for any route
 *
 * Requirements:
 * - Call useSearch() and useNavigate() in your component and pass them in
 * - The route must have the query param defined in validateSearch (defaults to "sq")
 *
 * @example
 * const search = useSearch({ from: "/dashboard/payments" });
 * const navigate = useNavigate({ from: "/dashboard/payments" });
 * const { debouncedValue, isDebouncing, keyword, setKeyword, setSearchParams } = useTSRSearchQuery({
 *   search,
 *   navigate,
 *   query_param: "sq"
 * })
 */
export function useTSRSearchQuery<TSearch extends Record<string, any>>(
  opts: UseTSRSearchQueryProps<TSearch>,
) {
  const queryParam = opts.query_param;
  const debounceDelay = opts.debounce_delay || 1000;
  const [_, startTransition] = useTransition();
  const paramValueStr = opts.search?.[queryParam] ? String(opts.search?.[queryParam]) : undefined;
  // Get the query param value from search object
  const paramValue = paramValueStr ?? opts.default_value ?? "";

  const [keyword, setKeyword] = useState(paramValue ?? opts.default_value ?? "");
  const { debouncedValue, isDebouncing } = useDebouncedValue(keyword, debounceDelay);

  // Immediate search params update (for filters, pagination, etc.)
  const setSearchParams = useCallback(
    (patch: Partial<TSearch>) => {
      startTransition(() => {
        opts.navigate({
          search: (prev: any) => ({
            ...prev,
            ...patch,
          }),
          replace: true,
          viewTransition: false,
        });
      });
    },
    [opts.navigate, startTransition],
  );

  // Debounced search value update
  useEffect(() => {
    if (paramValue !== debouncedValue) {
      startTransition(() => {
        opts.navigate({
          search: (prev: any) => ({
            ...prev,
            [queryParam]: debouncedValue || undefined,
          }),
          replace: true,
          viewTransition: false,
        });
      });
    }
  }, [debouncedValue, paramValue, queryParam, opts.navigate, startTransition]);

  return { debouncedValue, isDebouncing, keyword, setKeyword, setSearchParams };
}
