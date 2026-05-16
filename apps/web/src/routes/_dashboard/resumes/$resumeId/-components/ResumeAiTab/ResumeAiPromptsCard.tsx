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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Search, Sparkles, WandSparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { ResumeAiPromptAction } from "./resume-ai-types";

interface ResumeAiPromptsCardProps {
  clearDialogOpen: boolean;
  clearScope: "remote" | "both" | null;
  hasJobDescription: boolean;
  hasMessages: boolean;
  isBusy: boolean;
  isClearPending: boolean;
  isReady: boolean;
  onClearBoth: () => void;
  onClearDialogOpenChange: (open: boolean) => void;
  onClearRemote: () => void;
  onSendStarter: ResumeAiPromptAction;
}

export function ResumeAiPromptsCard({
  clearDialogOpen,
  clearScope,
  hasJobDescription,
  hasMessages,
  isBusy,
  isClearPending,
  isReady,
  onClearBoth,
  onClearDialogOpenChange,
  onClearRemote,
  onSendStarter,
}: ResumeAiPromptsCardProps) {
  return (
    <Card className="overflow-hidden border-0 bg-[color-mix(in_oklch,var(--color-base-200)_92%,var(--color-base-content)_8%)] shadow-[0_18px_55px_color-mix(in_oklch,var(--color-base-content)_8%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
      <CardHeader className="gap-3 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Resume AI Assistant</CardTitle>
              <CardDescription className="mt-1 max-w-3xl text-sm leading-6">
                Ask for resume-fit analysis, sharper summaries, stronger bullets, or a tailored
                draft.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)] px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" />
            {isReady ? "Ready" : "Provider needed"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <StarterButton
          dataTest="resume-ai-starter-match"
          disabled={!hasJobDescription || isBusy || !isReady}
          icon={<Search className="size-4" />}
          label="Analyze job fit"
          sublabel="Match gaps and wins"
          onClick={() =>
            onSendStarter(
              "Use the saved job description and tell me how well this resume matches it, including the biggest gaps.",
            )
          }
        />
        <StarterButton
          dataTest="resume-ai-starter-summary"
          disabled={isBusy || !isReady}
          icon={<Bot className="size-4" />}
          label="Rewrite summary"
          sublabel="Senior-positioned draft"
          onClick={() =>
            onSendStarter(
              "Load the current resume and draft a sharper professional summary targeted at senior full-stack roles.",
            )
          }
        />
        <StarterButton
          dataTest="resume-ai-starter-draft"
          disabled={isBusy || !isReady}
          icon={<WandSparkles className="size-4" />}
          label="Plan a tailored draft"
          sublabel="Find reusable blocks"
          onClick={() =>
            onSendStarter(
              "Load the current resume, search for the strongest relevant blocks, and propose a tailored draft plan before writing any JSON.",
            )
          }
        />
        <ClearChatDialog
          clearScope={clearScope}
          hasMessages={hasMessages}
          isBusy={isBusy}
          isPending={isClearPending}
          open={clearDialogOpen}
          onClearBoth={onClearBoth}
          onClearRemote={onClearRemote}
          onOpenChange={onClearDialogOpenChange}
        />
      </CardContent>
    </Card>
  );
}

function StarterButton(props: {
  dataTest: string;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  sublabel: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={props.disabled}
      onClick={props.onClick}
      className="h-auto justify-start gap-3 rounded-xl bg-base-100/70 px-3 py-3 text-left shadow-none ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)] hover:bg-[color-mix(in_oklch,var(--color-primary)_10%,var(--color-base-100))]"
      data-test={props.dataTest}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--color-primary)_14%,transparent)] text-primary">
        {props.icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span>{props.label}</span>
        <span className="text-xs font-normal text-muted-foreground">{props.sublabel}</span>
      </span>
    </Button>
  );
}

function ClearChatDialog(props: {
  clearScope: "remote" | "both" | null;
  hasMessages: boolean;
  isBusy: boolean;
  isPending: boolean;
  onClearBoth: () => void;
  onClearRemote: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={props.isBusy || !props.hasMessages || props.isPending}
          className="h-auto rounded-xl px-4 text-muted-foreground hover:text-foreground"
          data-test="resume-ai-clear"
        >
          {props.isPending ? "Clearing..." : "Clear chat"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
          <AlertDialogDescription className="leading-6">
            Choose whether to delete only the synced server copy or delete both the synced copy and
            this browser's local cached conversation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="outline"
            disabled={props.isPending}
            onClick={props.onClearRemote}
            data-test="resume-ai-clear-remote"
          >
            {props.clearScope === "remote" ? "Clearing..." : "Remote only"}
          </AlertDialogAction>
          <AlertDialogAction
            variant="destructive"
            disabled={props.isPending}
            onClick={props.onClearBoth}
            data-test="resume-ai-clear-both"
          >
            {props.clearScope === "both" ? "Clearing..." : "Remote and local"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
