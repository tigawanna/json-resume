import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useEnsureDb } from "event-sourced-collection/react";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { applyManagedSyncGate, kickManagedSync } from "./app-settings";
import { db as dbProxy, ensureDb, type AppDb } from "./collection";
import {
  canAutoReloadForOpfsRecovery,
  isOpfsTempDirBusyError,
  reloadForOpfsRecovery,
  toOpfsBusyUserError,
} from "./opfs-recovery";

declare global {
  interface Window {
    /** Playwright-only handle to the in-browser event-sourced DB. */
    __e2eEventSourcedDb?: AppDb;
  }
}

type EventSourcedDbContextValue = {
  db: AppDb;
};

const EventSourcedDbContext = createContext<EventSourcedDbContextValue | null>(null);

type EventSourcedDbProviderProps = {
  children: ReactNode;
  /** Shown while OPFS SQLite is opening. Defaults to a minimal loading shell. */
  fallback?: ReactNode;
  /** Shown when `ensureDb()` rejects. Receives the thrown error. */
  errorFallback?: (error: Error) => ReactNode;
};

/**
 * Opens the event-sourced DB once for a subtree, then exposes it via {@link useEventSourcedDb}.
 * Safe under SSR: `ensureDb` only runs in `useEffect` (browser).
 */
export function EventSourcedDbProvider({
  children,
  fallback,
  errorFallback,
}: EventSourcedDbProviderProps) {
  const { viewer } = useViewer();
  const isAuthenticated = Boolean(viewer.user?.id);

  const { ready, error } = useEnsureDb({
    ensureDb,
    deps: [isAuthenticated],
    onReady: (db) => {
      applyManagedSyncGate(db, isAuthenticated);
      // Background: do not block the shell on network sync.
      kickManagedSync(db);
      if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
        window.__e2eEventSourcedDb = db;
      }
    },
  });

  const opfsBusy = error !== null && isOpfsTempDirBusyError(error);
  const recovering = opfsBusy && canAutoReloadForOpfsRecovery();

  useEffect(() => {
    if (recovering) reloadForOpfsRecovery();
  }, [recovering]);

  if (error && !recovering) {
    const surfaced = opfsBusy ? toOpfsBusyUserError(error) : error;
    if (errorFallback) {
      return errorFallback(surfaced);
    }
    throw surfaced;
  }

  if (!ready) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {fallback ?? (
          <div data-test="event-sourced-db-loading" className="text-base-content/60 p-4 text-sm">
            Opening local database…
          </div>
        )}
      </div>
    );
  }

  return <EventSourcedDbContext value={{ db: dbProxy }}>{children}</EventSourcedDbContext>;
}

/**
 * Resolved event-sourced DB for the nearest {@link EventSourcedDbProvider}.
 * Throws if used outside the provider or before init finishes (children only
 * render after ready).
 */
export function useEventSourcedDb(): AppDb {
  const ctx = useContext(EventSourcedDbContext);
  if (!ctx) {
    throw new Error("useDb must be used within EventSourcedDbProvider");
  }
  return ctx.db;
}
