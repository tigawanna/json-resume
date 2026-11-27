import { readAppSettings, updateAppSettings } from "@/data-access-layer/event-sourced/app-settings";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import type { ListTablePrefs } from "@/data-access-layer/event-sourced/schemas";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

type ListSearchSlice = {
  hidden?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

function prefsEqual(a: ListTablePrefs | undefined, b: ListTablePrefs) {
  return (
    (a?.hidden ?? undefined) === (b.hidden ?? undefined) &&
    (a?.sortBy ?? undefined) === (b.sortBy ?? undefined) &&
    (a?.sortDirection ?? undefined) === (b.sortDirection ?? undefined)
  );
}

function fromSearch(search: ListSearchSlice): ListTablePrefs {
  return {
    hidden: search.hidden,
    sortBy: search.sortBy,
    sortDirection: search.sortDirection,
  };
}

/**
 * Restores column visibility + sort from the local settings collection, then
 * writes later URL changes back so they survive navigating into a résumé.
 */
export function usePersistedListTablePrefs(db: AppDb, listKey: string, search: ListSearchSlice) {
  const navigate = useNavigate();
  const hydrated = useRef(false);

  useEffect(() => {
    const settings = readAppSettings(db);
    const stored = settings.listTablePrefs?.[listKey];

    if (!hydrated.current) {
      hydrated.current = true;
      const urlHasPrefs = Boolean(search.hidden || search.sortBy || search.sortDirection);
      if (!urlHasPrefs && stored && (stored.hidden || stored.sortBy || stored.sortDirection)) {
        void navigate({
          to: ".",
          search: (prev: Record<string, unknown>) => ({
            ...prev,
            hidden: stored.hidden,
            sortBy: stored.sortBy,
            sortDirection: stored.sortDirection,
          }),
          replace: true,
        });
        return;
      }
    }

    const next = fromSearch(search);
    if (prefsEqual(stored, next)) return;

    const empty = !next.hidden && !next.sortBy && !next.sortDirection;
    const listTablePrefs = { ...settings.listTablePrefs };
    if (empty) {
      delete listTablePrefs[listKey];
    } else {
      listTablePrefs[listKey] = next;
    }
    updateAppSettings(db, { listTablePrefs });
  }, [db, listKey, navigate, search.hidden, search.sortBy, search.sortDirection]);
}
