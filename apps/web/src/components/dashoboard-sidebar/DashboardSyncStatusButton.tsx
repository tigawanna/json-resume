import { buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { APP_SETTINGS_ID, readAppSettings } from "@/data-access-layer/event-sourced/app-settings";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useEventSourcedSyncStatus } from "@/data-access-layer/event-sourced/use-sync-status";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";
import { ManagedSyncControls } from "@/components/sync/ManagedSyncControls";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Link, useLocation } from "@tanstack/react-router";
import {
  CloudAlert,
  CloudCheck,
  RefreshCw,
  RefreshCwOff,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

type SyncUiState = "logged-out" | "disabled" | "syncing" | "error" | "synced";

const STATUS: Record<
  SyncUiState,
  { label: string; tooltip: string; description: string; icon: LucideIcon; iconClass: string }
> = {
  "logged-out": {
    label: "Sign in",
    tooltip: "Sign in to sync",
    description: "Sign in to push this library to the managed server.",
    icon: RefreshCwOff,
    iconClass: "text-base-content",
  },
  disabled: {
    label: "Sync off",
    tooltip: "Managed sync is off",
    description: "Turn on managed sync to push your local outbox.",
    icon: RefreshCwOff,
    iconClass: "text-base-content",
  },
  syncing: {
    label: "Syncing",
    tooltip: "Sync in progress",
    description: "Pushing and pulling changes with the managed server.",
    icon: RefreshCw,
    iconClass: "text-primary animate-spin",
  },
  error: {
    label: "Sync error",
    tooltip: "Sync error",
    description: "Sync hit a problem. Review the event queue or try again.",
    icon: CloudAlert,
    iconClass: "text-error",
  },
  synced: {
    label: "Synced",
    tooltip: "Synced with managed server",
    description: "This device matches the managed server.",
    icon: CloudCheck,
    iconClass: "text-primary",
  },
};

function useManagedSyncUiState(): {
  state: SyncUiState;
  lastError: string | null;
  isOnline: boolean;
} {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const isOnline = useOnlineStatus();
  const isAuthenticated = Boolean(viewer.user?.id);
  const { isSyncing, lastError, failedCount, deadLetterCount } = useEventSourcedSyncStatus();

  readAppSettings(db);
  const { data } = useLiveQuery(
    (q) => q.from({ row: db.collections.settings }).where(({ row }) => eq(row.id, APP_SETTINGS_ID)),
    [],
  );
  const syncEnabled = Boolean(data?.[0]?.syncEnabled ?? readAppSettings(db).syncEnabled);
  const managedOn = isAuthenticated && syncEnabled && db.getSyncEnabled();

  if (!isAuthenticated) return { state: "logged-out", lastError, isOnline };
  if (!isOnline || !managedOn) return { state: "disabled", lastError, isOnline };
  if (isSyncing) return { state: "syncing", lastError, isOnline };
  if (lastError || failedCount > 0 || deadLetterCount > 0)
    return { state: "error", lastError, isOnline };
  return { state: "synced", lastError, isOnline };
}

const triggerClass = buttonVariants({ variant: "ghost", size: "icon" });

function OfflineIndicator() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(triggerClass, "size-7")}
          data-test="dashboard-offline-status"
          aria-label="No internet connection"
        >
          <WifiOff className="text-warning size-4" strokeWidth={2.25} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">No internet connection</TooltipContent>
    </Tooltip>
  );
}

/**
 * Header control for managed sync — lives on the far right of the dashboard chrome.
 * Opens a side drawer on desktop and a bottom sheet on mobile.
 * Offline is a separate button beside it. While offline, sync always shows the off icon.
 */
export function DashboardSyncStatusButton({ className }: { className?: string }) {
  const { state, lastError, isOnline } = useManagedSyncUiState();
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const pathname = useLocation({ select: (location) => location.pathname });
  const meta = STATUS[state];
  const Icon = meta.icon;
  const tooltip =
    !isOnline && state === "disabled"
      ? "Sync off"
      : state === "error" && lastError
        ? `Sync error: ${lastError}`
        : meta.tooltip;
  const description =
    !isOnline && state !== "logged-out"
      ? "No internet connection. Sync stays off until you're back online."
      : state === "error" && lastError
        ? lastError
        : meta.description;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {isOnline ? null : <OfflineIndicator />}
      <Drawer open={open} onOpenChange={setOpen} direction={isDesktop ? "right" : "bottom"}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DrawerTrigger
              className={cn(
                triggerClass,
                state === "logged-out" ? "h-7 w-auto gap-1 px-1.5" : "size-7",
              )}
              data-test="dashboard-sync-status"
              data-sync-state={state}
              data-online={isOnline ? "true" : "false"}
              aria-label={meta.label}
              aria-busy={state === "syncing" ? true : undefined}
            >
              {state === "logged-out" ? (
                <>
                  <RefreshCwOff className="text-base-content size-4" strokeWidth={2.25} />
                  <span className="text-xs font-medium">Sign in</span>
                </>
              ) : (
                <Icon className={cn("size-4", meta.iconClass)} strokeWidth={2.25} />
              )}
            </DrawerTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{tooltip}</TooltipContent>
        </Tooltip>
        <DrawerContent
          className="data-[vaul-drawer-direction=bottom]:max-h-[85vh] data-[vaul-drawer-direction=right]:sm:max-w-md"
          data-test="dashboard-sync-drawer"
        >
          <DrawerHeader className="gap-3 px-6 pt-8 pb-2">
            <DrawerTitle className="text-lg">{meta.label}</DrawerTitle>
            <DrawerDescription className="text-sm leading-relaxed">{description}</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-8 overflow-y-auto px-6 pt-4 pb-10">
            <ManagedSyncControls returnTo={pathname} presentation="plain" />
            {state === "error" || state === "synced" || state === "syncing" ? (
              <Link
                to="/events"
                search={{ tab: state === "error" ? "deadletter" : "outbox" }}
                className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                data-test="dashboard-sync-events-link"
                onClick={() => setOpen(false)}
              >
                View sync events
              </Link>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
