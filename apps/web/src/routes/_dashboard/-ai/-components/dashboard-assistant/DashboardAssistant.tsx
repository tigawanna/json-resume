import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDown, Settings, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDashboardAssistantChat } from "../../-hooks/use-dashboard-assistant";
import { AiSettingsForm } from "../AiSettingsForm";
import { EventSourcedAiSettingsSheet } from "../EventSourcedAiSettingsSheet";
import { AssistantFace } from "./AssistantFace";
import { DashboardAssistantConversation } from "./DashboardAssistantConversation";

const PANEL_ID = "dashboard-assistant-panel";

/** The résumé editor has its own assistant in its AI tab. */
function isResumeEditorPath(pathname: string) {
  return /^\/resumes\/[^/]+/.test(pathname);
}

function isDevRoute(pathname: string) {
  return pathname === "/dev" || pathname.startsWith("/dev/");
}

/**
 * Floating assistant for every dashboard page except the résumé editor. Stays
 * mounted across navigation, so a reply keeps streaming while the user moves around.
 */
export function DashboardAssistant() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = useLocation({ select: (location) => location.pathname });
  const assistant = useDashboardAssistantChat({ onHandedOff: () => setOpen(false) });
  const hidden = isResumeEditorPath(pathname) || isDevRoute(pathname);
  const isWorking = assistant.isLoading || assistant.sessionGenerating;
  const { composerRef } = assistant;

  useEffect(() => {
    if (!open || !assistant.isReady) return;
    const timer = window.setTimeout(() => composerRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, assistant.isReady, composerRef]);

  if (hidden) return null;

  return (
    <>
      {open ? (
        <section
          id={PANEL_ID}
          role="dialog"
          aria-label="Dashboard assistant"
          className={cn(
            "fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-base-100 text-base-content shadow-2xl",
            "inset-x-2 top-16 bottom-22 sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-24 sm:h-[min(42rem,calc(100dvh-8rem))] sm:w-108",
            "origin-bottom-right animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200",
          )}
          data-test="dashboard-assistant-panel"
        >
          <header className="flex shrink-0 items-center gap-2.5 border-b border-border/60 px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <AssistantFace className="size-5" working={isWorking} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight font-semibold">Assistant</p>
              <p className="truncate text-xs text-muted-foreground">
                {assistant.isReady ? "Résumés, jobs and applications" : "Not set up"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => setSettingsOpen(true)}
              aria-label="AI settings"
              data-test="dashboard-assistant-settings"
            >
              <Settings className="size-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  disabled={isWorking || assistant.messages.length === 0}
                  aria-label="Clear conversation"
                  data-test="dashboard-assistant-clear"
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Removes the dashboard assistant's messages from this browser. Jobs it saved and
                    résumés it opened stay as they are.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel size="sm" variant="outline">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction variant="destructive" size="sm" onClick={assistant.clear}>
                    Clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              data-test="dashboard-assistant-close"
            >
              <X className="size-4" />
            </Button>
          </header>

          {assistant.isReady ? (
            <DashboardAssistantConversation
              activeModelLabel={assistant.activeModelLabel}
              activeRoutingLabel={assistant.activeRoutingLabel}
              apiKey={assistant.settings?.apiKey ?? null}
              awaitingApproval={assistant.awaitingApproval}
              chat={assistant.chat}
              compacting={assistant.compacting}
              lastCompaction={assistant.lastCompaction}
              compactedThisTurn={assistant.compactedThisTurn}
              composerRef={assistant.composerRef}
              endOfMessagesRef={assistant.endOfMessagesRef}
              errorMessage={assistant.errorMessage}
              isBusy={assistant.isLoading}
              sessionChars={assistant.sessionChars}
              sessionGenerating={assistant.sessionGenerating}
              onSend={assistant.sendText}
              onRetry={assistant.retryLastRun}
              onStop={assistant.stop}
              onEscape={() => setOpen(false)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          ) : (
            <AssistantSetup onOpenSettings={() => setOpen(false)} />
          )}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className={cn(
          "fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-content shadow-lg ring-4 ring-primary/15 transition-transform duration-200 hover:scale-105 focus-visible:ring-primary/40 focus-visible:outline-none active:scale-95 sm:right-6 sm:bottom-6",
        )}
        data-test="dashboard-assistant-fab"
      >
        {open ? (
          <ChevronDown className="size-6" />
        ) : (
          <AssistantFace className="size-8" working={isWorking} />
        )}
        {!open && isWorking ? (
          <span
            aria-hidden
            className="absolute top-0.5 right-0.5 size-3 animate-pulse rounded-full bg-success ring-2 ring-base-100"
          />
        ) : null}
      </button>

      <EventSourcedAiSettingsSheet
        open={settingsOpen}
        apiKeyRejected={assistant.apiKeyRejected}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}

function AssistantSetup({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5"
      data-test="dashboard-assistant-setup"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <AssistantFace className="size-9" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Connect a model to get started</p>
          <p className="text-sm text-muted-foreground text-pretty">
            Add your OpenRouter key and pick a model. Every assistant in the app uses it.
          </p>
        </div>
      </div>
      <AiSettingsForm variant="connection" footerClassName="pt-1" />
      <Link
        to="/settings"
        hash="ai"
        onClick={onOpenSettings}
        className="text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        data-test="dashboard-assistant-settings-link"
      >
        More options in Settings
      </Link>
    </div>
  );
}
