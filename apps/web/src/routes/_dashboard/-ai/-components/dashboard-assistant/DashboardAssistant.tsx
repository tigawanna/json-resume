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
import { useLocation } from "@tanstack/react-router";
import {
  ChevronDown,
  History,
  Maximize2,
  Minimize2,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  OPEN_ASSISTANT_EVENT,
  useDashboardAssistantChat,
} from "../../-hooks/use-dashboard-assistant";
import { formatConversationAge } from "../../-utils/assistant-conversations";
import { assistantHidden } from "../../-utils/page-context";
import { EventSourcedAiSettingsSheet } from "../EventSourcedAiSettingsSheet";
import { HostedAiSignIn, useHostedAiSignedIn } from "../HostedAiSignIn";
import { DashboardAssistantConversation } from "./DashboardAssistantConversation";

const PANEL_ID = "dashboard-assistant-panel";

/**
 * Floating assistant for every dashboard page except the résumé editor.
 * Stays mounted across navigation, so a reply keeps streaming while the user moves around.
 */
export function DashboardAssistant() {
  const [open, setOpen] = useState(false);
  const [presentation, setPresentation] = useState<"dock" | "sheet">("dock");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = useLocation({ select: (location) => location.pathname });
  const signedIn = useHostedAiSignedIn();
  const assistant = useDashboardAssistantChat({ onHandedOff: () => setOpen(false) });
  const hidden = assistantHidden(pathname);
  const isWorking = assistant.isLoading || assistant.sessionGenerating;
  const { composerRef } = assistant;
  const sheet = open && presentation === "sheet";
  const startFreshRef = useRef(assistant.startNew);
  startFreshRef.current = () => {
    const current = assistant.conversations.find(
      (conversation) => conversation.id === assistant.activeConversationId,
    );
    if (current && current.messageCount === 0) return;
    assistant.startNew();
  };

  useEffect(() => {
    if (!open || !assistant.isReady) return;
    const timer = window.setTimeout(() => composerRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, assistant.isReady, composerRef]);

  useEffect(() => {
    function openFromPage(event: Event) {
      const fresh = event instanceof CustomEvent && event.detail?.fresh === true;
      if (fresh) startFreshRef.current();
      setOpen(true);
    }
    window.addEventListener(OPEN_ASSISTANT_EVENT, openFromPage);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, openFromPage);
  }, []);

  if (hidden) return null;

  return (
    <>
      {sheet ? (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setPresentation("dock")}
          data-test="dashboard-assistant-sheet-overlay"
        />
      ) : null}
      {open ? (
        <section
          id={PANEL_ID}
          role="dialog"
          aria-label="Assistant"
          className={cn(
            "fixed z-40 flex flex-col overflow-hidden bg-base-100 text-base-content",
            sheet
              ? "inset-y-0 right-0 w-full border-l border-border/70 shadow-2xl sm:w-[min(42rem,calc(100%-16rem))]"
              : "inset-x-2 top-16 bottom-22 rounded-2xl border border-border/70 shadow-2xl sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-24 sm:h-[min(42rem,calc(100dvh-8rem))] sm:w-108",
          )}
          data-test={sheet ? "dashboard-assistant-sheet" : "dashboard-assistant-panel"}
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Sparkles className={cn("size-4", isWorking && "animate-pulse")} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight font-semibold">Assistant</p>
              <p className="truncate text-xs text-muted-foreground">{assistant.routeLabel}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={assistant.startNew}
              aria-label="New conversation"
              data-test="dashboard-assistant-new"
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => setHistoryOpen((value) => !value)}
              aria-label="Conversation history"
              aria-expanded={historyOpen}
              data-test="dashboard-assistant-history"
            >
              <History className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => setPresentation(sheet ? "dock" : "sheet")}
              aria-label={sheet ? "Collapse assistant" : "Expand assistant"}
              data-test={sheet ? "dashboard-assistant-collapse" : "dashboard-assistant-expand"}
            >
              {sheet ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
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
                    Removes this conversation from this browser. Other pages keep theirs. Rows it
                    already saved stay as they are.
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
              onClick={() => {
                setOpen(false);
                setPresentation("dock");
                setHistoryOpen(false);
              }}
              aria-label="Close assistant"
              data-test="dashboard-assistant-close"
            >
              <X className="size-4" />
            </Button>
          </header>

          {historyOpen ? (
            <div
              className="min-h-0 flex-1 overflow-y-auto"
              data-test="dashboard-assistant-history-list"
            >
              {assistant.conversations.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  No other conversations yet.
                </p>
              ) : (
                assistant.conversations.map((conversation) => {
                  const selected = conversation.id === assistant.activeConversationId;
                  const titled = conversation.title !== conversation.routeLabel;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => {
                        assistant.selectConversation(conversation.id);
                        setHistoryOpen(false);
                      }}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-base-200/70",
                        selected && "bg-primary/10",
                      )}
                      data-test="dashboard-assistant-history-item"
                    >
                      <span className="truncate text-sm font-medium">
                        {titled ? conversation.title : conversation.routeLabel}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {titled ? `${conversation.routeLabel} · ` : ""}
                        {formatConversationAge(conversation.updatedAt)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}

          {!historyOpen && !signedIn ? <HostedAiSignIn /> : null}
          {!historyOpen && signedIn ? (
            <DashboardAssistantConversation
              activeModelLabel={assistant.activeModelLabel}
              activeRoutingLabel={assistant.activeRoutingLabel}
              apiKey={assistant.settings?.apiKey ?? null}
              awaitingApproval={assistant.awaitingApproval}
              canSend={assistant.isReady}
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
              pageLabel={assistant.routeLabel}
              pageSummary={assistant.page.summary}
            />
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full border border-primary/35 bg-base-100 text-primary shadow-[0_0_24px_color-mix(in_oklch,var(--color-primary)_45%,transparent)] transition-transform duration-200 hover:scale-105 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none active:scale-95 sm:right-6 sm:bottom-6"
        data-test="dashboard-assistant-fab"
      >
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse rounded-full bg-primary/15 blur-[2px]"
        />
        {open ? (
          <ChevronDown className="relative size-6" />
        ) : (
          <Sparkles className="relative size-6" aria-hidden />
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
