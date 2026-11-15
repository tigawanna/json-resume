import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUp,
  Brain,
  CheckCircle2,
  Eye,
  FileText,
  GitCompareArrows,
  History,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Paperclip,
  Plus,
  RotateCcw,
  Settings,
  Square,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Section, SectionIntro } from "./primitives";
import { useWorkbenchStream } from "./use-workbench-stream";
import {
  APPLICATION_ANSWERS_CONTENT,
  COVER_LETTER_CONTENT,
  RESUME_CONTENT,
  WORKBENCH_CHANGES,
  WORKBENCH_EVENTS,
  WORKBENCH_TOOL_ORDER,
  WORKBENCH_VIEWS,
  type WorkbenchPart,
  type WorkbenchPhase,
  type WorkbenchStreamState,
  type WorkbenchToolRun,
  type WorkbenchView,
} from "./workbench-script";

const ATTACHED = ["job-description.md", "library/bullets.json", "library/skills.json"] as const;

const PHASE_LABEL: Record<WorkbenchPhase, string> = {
  typing: "Drafting",
  thinking: "Request sent",
  text: "Streaming response",
  tool: "Calling tools",
  done: "Ready",
};

const SUGGESTED_PROMPTS = [
  "Tailor this résumé to the job post",
  "Draft the cover letter and the answers",
  "Rank my bullets against the posting",
] as const;

const VIEW_META = {
  preview: { label: "Preview", icon: Eye },
  changes: { label: "Changes", icon: GitCompareArrows },
  events: { label: "Events", icon: History },
  letter: { label: "Letter", icon: Mail },
  answers: { label: "Q&A", icon: MessageSquareText },
} as const;

export function LandingWorkbench() {
  return (
    <Section id="workbench" dataTest="landing-workbench">
      <div className="px-6 pt-14 pb-4 md:px-12 md:pt-20">
        <SectionIntro
          title={
            <>
              An ergonomic iteration <span className="text-primary">workbench</span>
            </>
          }
        />
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">
          Rough demo. Scripted, no API calls.
        </p>
      </div>
      <div className="px-3 pb-10 md:px-10 md:pb-14">
        <WorkbenchFrame />
        <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground">
          <span>Same loop, your data. Local-first and reversible.</span>
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-primary transition-opacity hover:opacity-80">
            Open the editor
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

function landedToolNames(parts: WorkbenchPart[]) {
  const names = new Set<string>();
  for (const part of parts) {
    if (part.kind === "tool" && part.tool.result) names.add(part.tool.name);
  }
  return names;
}

function WorkbenchFrame() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const { state, setView, restart } = useWorkbenchStream({ active });
  const scrollRef = useRef<HTMLDivElement>(null);
  const landed = landedToolNames(state.parts);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setActive(entry.isIntersecting);
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [state.parts]);

  return (
    <div
      ref={frameRef}
      data-test="landing-workbench-frame"
      className="mx-auto max-w-5xl overflow-hidden border border-border/60 bg-base-100 shadow-sm">
      <WindowBar />

      <AiChrome />

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="flex min-h-0 flex-col border-b border-border/60 md:order-1 md:border-b-0">
          <div
            ref={scrollRef}
            className="flex h-72 flex-col gap-3 overflow-y-auto px-3 py-4 md:h-88 md:px-4"
            data-test="landing-workbench-chat">
            {state.prompt ? (
              <>
                <div className="flex justify-end">
                  <div className="max-w-[92%] rounded-2xl rounded-tr-md bg-primary/10 px-3 py-2 text-[12px] leading-relaxed text-base-content ring-1 ring-[color-mix(in_oklch,var(--color-primary)_34%,transparent)]">
                    {state.prompt}
                  </div>
                </div>

                <div className="flex flex-col items-start">
                  <div className="w-full max-w-[96%] rounded-2xl rounded-tl-md bg-base-100 px-3 py-2.5 shadow-sm ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)]">
                    <ChatStream state={state} onOpenView={setView} />

                    {state.phase === "done" ? null : (
                      <span
                        aria-hidden
                        className="mt-1 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle"
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <SuggestedPrompts />
            )}
          </div>

          <Composer state={state} />
        </div>

        <PreviewPanel
          view={state.view}
          onViewChange={setView}
          landed={landed}
          className="md:order-2 md:border-l"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-base-200/40 px-3 py-2 font-mono text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5",
                state.phase === "done" ? "bg-primary" : "animate-pulse bg-primary",
              )}
            />
            {state.phase}
          </span>
          <span className="tabular-nums">{state.tokens} tok</span>
          <span className="hidden tabular-nums sm:inline">
            {landed.size}/{WORKBENCH_TOOL_ORDER.length} tools
          </span>
          <span className="hidden tabular-nums md:inline">run {state.run + 1}</span>
        </div>
        <button
          type="button"
          onClick={restart}
          className="flex items-center gap-1 transition-colors hover:text-base-content"
          data-test="landing-workbench-replay">
          <RotateCcw className="size-3" />
          replay
        </button>
      </div>
    </div>
  );
}

function WindowBar() {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 bg-base-200/40 px-3 py-2">
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="size-2 rounded-full bg-primary/40" />
        <span className="size-2 rounded-full bg-primary/25" />
        <span className="size-2 rounded-full bg-primary/15" />
      </div>
      <p className="truncate font-mono text-[10px] text-muted-foreground">
        resumes/ai-engineer · tab: ai
      </p>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden items-center gap-1 border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
          <Paperclip className="size-2.5" />
          {ATTACHED.length} parts
        </span>
        <span className="flex items-center gap-1.5 border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          scripted
        </span>
      </div>
    </div>
  );
}

/** Decorative copy of `EventSourcedAiChrome`: Preview · settings · clear. */
function AiChrome() {
  return (
    <div
      aria-hidden
      className="flex h-9 shrink-0 items-center justify-end gap-1 border-b border-border/60 px-2"
      data-test="landing-workbench-ai-chrome">
      <span className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[11px] text-secondary-content">
        <FileText className="size-3.5" />
        Preview
      </span>
      <span className="flex size-7 items-center justify-center rounded-md text-muted-foreground">
        <Settings className="size-3.5" />
      </span>
      <span className="flex size-7 items-center justify-center rounded-md text-muted-foreground">
        <Trash2 className="size-3.5" />
      </span>
    </div>
  );
}

function Composer({ state }: { state: WorkbenchStreamState }) {
  const busy = state.phase === "thinking" || state.phase === "text" || state.phase === "tool";
  const canSend = state.draft.length > 0;

  let placeholder = "Ask for a fit analysis, a rewritten summary, or a tailored draft...";
  if (busy) placeholder = "Queue a follow-up, it sends when this reply finishes...";
  else if (state.prompt) placeholder = "Ask for another change...";

  return (
    <div className="border-t border-border/60 px-3 py-3" data-test="landing-workbench-composer">
      <div className="overflow-hidden rounded-2xl border border-base-content/15 bg-primary/10 text-base-content shadow-sm">
        <div className="min-h-13 px-4 pt-3 pb-1 text-[13px] leading-relaxed">
          {state.draft ? (
            <>
              {state.draft}
              {state.phase === "typing" ? (
                <span
                  aria-hidden
                  className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-primary align-middle"
                />
              ) : null}
            </>
          ) : (
            <span className="text-base-content/35">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <div className="flex min-w-0 items-center gap-1">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground">
              <Plus className="size-4" />
            </span>
            <span className="hidden min-w-0 items-center gap-1.5 px-1 text-[11px] sm:flex">
              <span className="truncate font-medium">Claude Sonnet 4.5</span>
              <span className="truncate text-muted-foreground">· OpenRouter</span>
            </span>
            <span className="flex min-w-0 items-center gap-1 rounded-full py-0.5 pr-0.5 pl-2 text-[11px] text-muted-foreground">
              <FileText className="size-3 shrink-0" />
              <span className="max-w-24 truncate">{RESUME_CONTENT.name}</span>
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full">
                <X className="size-3" />
              </span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1" aria-hidden>
            {busy ? (
              <span className="flex size-7 items-center justify-center rounded-md text-muted-foreground">
                <Square className="size-3.5" />
              </span>
            ) : null}
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-md bg-primary text-primary-content transition-opacity",
                !canSend && "opacity-50",
              )}>
              <ArrowUp className="size-4" />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-[11px] text-muted-foreground">
        {state.phase === "done" ? (
          <span>Ready</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <LoaderCircle className="size-3 animate-spin text-primary" />
            {PHASE_LABEL[state.phase]}
          </span>
        )}
        <span className="ml-auto font-mono text-[10px] tabular-nums">
          ~{state.tokens.toLocaleString()} tok
        </span>
      </div>
    </div>
  );
}

function ChatStream({
  state,
  onOpenView,
}: {
  state: WorkbenchStreamState;
  onOpenView: (view: WorkbenchView) => void;
}) {
  const lastPart = state.parts[state.parts.length - 1];

  return (
    <div data-test="landing-workbench-stream">
      {state.parts.map((part) => {
        const streaming = part.id === lastPart?.id;
        return (
          <div key={part.id} className="mt-1.5 first:mt-0">
            {part.kind === "thinking" ? (
              <ThinkingBlock text={part.text} streaming={streaming && state.phase === "thinking"} />
            ) : null}
            {part.kind === "text" ? <ScriptText text={part.text} /> : null}
            {part.kind === "tool" ? <ToolPart tool={part.tool} onOpenView={onOpenView} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function ToolPart({
  tool,
  onOpenView,
}: {
  tool: WorkbenchToolRun;
  onOpenView: (view: WorkbenchView) => void;
}) {
  if (tool.ask) return <AskCard tool={tool} />;
  return (
    <>
      <ToolChip tool={tool} />
      {tool.result ? <ToolSuccess tool={tool} onOpenView={onOpenView} /> : null}
    </>
  );
}

function AskCard({ tool }: { tool: WorkbenchToolRun }) {
  const ask = tool.ask;
  if (!ask) return null;
  const answered = tool.result !== null;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl bg-base-200/40 px-3 py-3 ring-1 ring-primary/25"
      data-test="landing-workbench-ask">
      <p className="text-[11px] font-medium text-base-content">{ask.question}</p>
      {answered ? (
        <p className="text-[11px] text-muted-foreground">{ask.selected}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {ask.options.map((option) => (
            <span
              key={option}
              className="rounded-lg border border-primary/15 bg-primary/10 px-2.5 py-2 text-left text-[11px] text-base-content/90">
              {option}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolChip({ tool }: { tool: WorkbenchToolRun }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-base-200/50 px-2 py-1.5 text-[10px]">
      <Wrench className="size-3 shrink-0 text-muted-foreground/70" />
      <span className="shrink-0 font-medium text-base-content/80">{toolLabel(tool.name)}</span>
      <span className="shrink-0 rounded-full bg-[color-mix(in_oklch,var(--color-base-content)_8%,transparent)] px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
        {tool.result ? "complete" : "input-streaming"}
      </span>
      {tool.result ? (
        <span className="ml-auto flex min-w-0 shrink items-center gap-1 text-success">
          <CheckCircle2 className="size-3 shrink-0" />
          <span className="truncate">{tool.summary}</span>
        </span>
      ) : (
        <span className="ml-auto max-w-[45%] truncate font-mono text-[9px] text-muted-foreground/70">
          {tool.args || "…"}
        </span>
      )}
    </div>
  );
}

/** Mirrors the green success cards the real cover-letter and answer tools render. */
function ToolSuccess({
  tool,
  onOpenView,
}: {
  tool: WorkbenchToolRun;
  onOpenView: (view: WorkbenchView) => void;
}) {
  let view: WorkbenchView | null = null;
  let icon: ReactNode = null;
  let title = "";
  let meta = "";

  if (tool.name === "save_cover_letter") {
    view = "letter";
    icon = <Mail className="size-3.5" />;
    title = COVER_LETTER_CONTENT.title;
    meta = `Cover letter drafted · ${COVER_LETTER_CONTENT.wordCount} words`;
  } else if (tool.name === "save_application_answers") {
    view = "answers";
    icon = <MessageSquareText className="size-3.5" />;
    title = "Northwind — application answers";
    meta = `${APPLICATION_ANSWERS_CONTENT.length} answers saved · 1 detail for you`;
  }

  if (!view) return null;

  return (
    <div
      className="mt-1.5 flex items-center gap-2 rounded-lg bg-[color-mix(in_oklch,var(--color-success)_9%,var(--color-base-100))] px-2.5 py-2 ring-1 ring-[color-mix(in_oklch,var(--color-success)_25%,transparent)]"
      data-test={`landing-workbench-${view}-card`}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-base-content">{title}</p>
        <p className="truncate text-[10px] text-muted-foreground">{meta}</p>
      </div>
      <button
        type="button"
        onClick={() => onOpenView(view)}
        className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-success transition-opacity hover:opacity-75">
        <Eye className="size-3" />
        Preview
      </button>
    </div>
  );
}

function PreviewPanel({
  view,
  onViewChange,
  landed,
  className,
}: {
  view: WorkbenchView;
  onViewChange: (view: WorkbenchView) => void;
  landed: ReadonlySet<string>;
  className?: string;
}) {
  let added = 0;
  let removed = 0;
  for (const fixture of WORKBENCH_TOOL_ORDER) {
    if (!fixture.diff || !landed.has(fixture.name)) continue;
    added += fixture.diff.added;
    removed += fixture.diff.removed;
  }
  const hasDiff = added > 0 || removed > 0;

  return (
    <div
      className={cn("flex min-h-0 flex-col bg-base-100", className)}
      data-test="landing-workbench-preview">
      <header className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{RESUME_CONTENT.name}</span>
        <div
          className="flex w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-base-200 p-0.5 scrollbar-none lg:w-auto [&::-webkit-scrollbar]:hidden"
          data-test="landing-workbench-tabs">
          {WORKBENCH_VIEWS.map((value) => {
            const meta = VIEW_META[value];
            const Icon = meta.icon;
            const active = view === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onViewChange(value)}
                aria-pressed={active}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] whitespace-nowrap transition-colors",
                  active
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-muted-foreground hover:text-base-content",
                )}>
                <Icon className="size-3" />
                {meta.label}
                {value === "changes" && hasDiff ? (
                  <span className="font-mono text-[9px]">
                    <span className="text-success">+{added}</span>{" "}
                    <span className="text-error">−{removed}</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        {view === "preview" ? (
          <ResumePaper
            summaryDone={landed.has("set_summary")}
            bulletsDone={landed.has("set_experience_bullets")}
            skillsDone={landed.has("set_skills")}
          />
        ) : null}
        {view === "changes" ? <ChangesView landed={landed} /> : null}
        {view === "events" ? <EventsView landed={landed} /> : null}
        {view === "letter" ? <LetterView ready={landed.has("save_cover_letter")} /> : null}
        {view === "answers" ? <AnswersView ready={landed.has("save_application_answers")} /> : null}
      </div>
    </div>
  );
}

function ResumePaper({
  summaryDone,
  bulletsDone,
  skillsDone,
}: {
  summaryDone: boolean;
  bulletsDone: boolean;
  skillsDone: boolean;
}) {
  const skills = skillsDone ? RESUME_CONTENT.tailoredSkills : RESUME_CONTENT.baseSkills;

  return (
    <div
      className="mx-auto flex max-w-sm flex-col gap-3 bg-base-100 p-3 ring-1 ring-border/60 md:p-4"
      data-test="landing-workbench-resume">
      <div>
        <p className="font-serif text-lg leading-tight tracking-tight text-base-content">
          {RESUME_CONTENT.name}
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{RESUME_CONTENT.title}</p>
      </div>

      <div
        className={cn(
          "border-l-2 pl-3 transition-colors duration-500",
          summaryDone ? "border-primary" : "border-border",
        )}>
        <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
          Summary
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-base-content transition-opacity duration-500">
          {summaryDone ? RESUME_CONTENT.tailoredSummary : RESUME_CONTENT.baseSummary}
        </p>
      </div>

      <div className="hidden md:block">
        <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
          Experience
        </p>
        <p className="mt-1 text-[11px] font-medium text-base-content">Northwind — Staff engineer</p>
        <ul className="mt-1.5 space-y-1.5">
          {RESUME_CONTENT.bullets.map((bullet) => {
            const dropped = bulletsDone && bullet.after === null;
            const text = bulletsDone && bullet.after ? bullet.after : bullet.before;
            return (
              <li
                key={bullet.before}
                className={cn(
                  "flex gap-1.5 text-[11px] leading-relaxed transition-all duration-500",
                  dropped
                    ? "text-muted-foreground/50 line-through decoration-border"
                    : "text-muted-foreground",
                )}>
                <span aria-hidden className="mt-1.5 size-1 shrink-0 bg-primary/60" />
                <span>{text}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="hidden flex-wrap gap-1 md:flex">
        {skills.map((tag) => (
          <span
            key={tag}
            className={cn(
              "border border-border/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground transition-colors duration-500",
              skillsDone &&
                (tag === "TypeScript" || tag === "React") &&
                "border-primary/40 text-primary",
            )}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChangesView({ landed }: { landed: ReadonlySet<string> }) {
  const rows = WORKBENCH_CHANGES.filter((row) => landed.has(row.tool));

  if (rows.length === 0) {
    return (
      <PanelEmpty
        icon={<GitCompareArrows className="size-4" />}
        title="No changes yet"
        hint="Edits appear here as the tools land, line by line."
      />
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-2" data-test="landing-workbench-changes">
      <p className="px-1 font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
        This pass
      </p>
      {rows.map((row) => (
        <div key={row.label} className="bg-base-100 p-2.5 ring-1 ring-border/60">
          <p className="font-mono text-[9px] text-muted-foreground">{row.label}</p>
          {row.removed ? (
            <p className="mt-1 flex gap-1.5 text-[10px] leading-relaxed text-error/80">
              <span aria-hidden className="shrink-0 font-mono">
                −
              </span>
              <span className="line-through decoration-error/40">{row.removed}</span>
            </p>
          ) : null}
          {row.added ? (
            <p className="mt-1 flex gap-1.5 text-[10px] leading-relaxed text-success">
              <span aria-hidden className="shrink-0 font-mono">
                +
              </span>
              <span>{row.added}</span>
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EventsView({ landed }: { landed: ReadonlySet<string> }) {
  const rows = WORKBENCH_EVENTS.filter((row) => landed.has(row.tool));

  if (rows.length === 0) {
    return (
      <PanelEmpty
        icon={<History className="size-4" />}
        title="No events yet"
        hint="Each edit lands here. Undo rolls that change and everything newer back."
      />
    );
  }

  return (
    <div data-test="landing-workbench-events">
      <p className="border-b border-border/60 px-1 pb-2 text-[10px] text-muted-foreground">
        Newest first. Undo rolls that change and everything newer back.
      </p>
      <ol>
        {rows.map((row, index) => (
          <li
            key={row.tool}
            className="flex items-center gap-2 border-b border-border/40 px-1 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-base-content">{row.label}</p>
              <p className="truncate text-[10px] text-muted-foreground">{row.detail}</p>
            </div>
            {index < rows.length - 1 ? (
              <span
                className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
                aria-label="Undo this and newer">
                <History className="size-3.5" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function LetterView({ ready }: { ready: boolean }) {
  if (!ready) {
    return (
      <PanelEmpty
        icon={<Mail className="size-4" />}
        title="No letter yet"
        hint="save_cover_letter writes it, then this tab opens on its own."
      />
    );
  }

  return (
    <div
      className="mx-auto max-w-sm bg-base-100 p-4 ring-1 ring-border/60"
      data-test="landing-workbench-letter">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
        <div className="min-w-0">
          <p className="truncate font-serif text-sm text-base-content">
            {COVER_LETTER_CONTENT.title}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
            {COVER_LETTER_CONTENT.wordCount} words · drafted from this résumé
          </p>
        </div>
        <Mail className="size-3.5 shrink-0 text-success" />
      </div>
      <div className="mt-3 space-y-2 font-serif text-[11px] leading-relaxed text-base-content/85">
        {COVER_LETTER_CONTENT.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

function AnswersView({ ready }: { ready: boolean }) {
  if (!ready) {
    return (
      <PanelEmpty
        icon={<MessageSquareText className="size-4" />}
        title="No answers yet"
        hint="save_application_answers writes them, then this tab opens on its own."
      />
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-2" data-test="landing-workbench-answers">
      <div className="flex items-center justify-between px-1">
        <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
          Application answers
        </p>
        <span className="font-mono text-[9px] text-success">
          {APPLICATION_ANSWERS_CONTENT.length} saved
        </span>
      </div>
      {APPLICATION_ANSWERS_CONTENT.map((row, index) => (
        <div key={row.question} className="bg-base-100 p-2.5 ring-1 ring-border/60">
          <p className="text-[11px] font-medium text-base-content">
            {index + 1}. {row.question}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{row.answer}</p>
          {row.needsDetail ? (
            <span className="mt-1.5 inline-block bg-warning/15 px-1.5 py-0.5 font-mono text-[9px] text-warning">
              needs your detail
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PanelEmpty({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 px-4 py-10 text-center">
      <span className="flex size-8 items-center justify-center bg-base-200 text-muted-foreground">
        {icon}
      </span>
      <p className="text-xs font-medium text-base-content">{title}</p>
      <p className="max-w-[30ch] font-mono text-[10px] leading-relaxed text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}

function SuggestedPrompts() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-2">
      <p className="px-1 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        Try
      </p>
      {SUGGESTED_PROMPTS.map((prompt) => (
        <span
          key={prompt}
          className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
          <ArrowUp className="size-3 shrink-0 text-primary" />
          {prompt}
        </span>
      ))}
    </div>
  );
}

function ThinkingBlock({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <details open={streaming} className="group max-w-full overflow-hidden">
      <summary className="flex cursor-default list-none items-center gap-2 py-0.5 text-xs text-muted-foreground marker:hidden">
        <Brain className="size-3.5 shrink-0" />
        <span>Thinking</span>
        {streaming ? <span className="font-mono text-[9px] text-primary">streaming</span> : null}
        <span className="ml-auto font-mono text-[9px] tabular-nums text-muted-foreground/70">
          {text.length} ch
        </span>
      </summary>
      <p
        className={cn(
          "mt-1 border-l border-border/60 pl-3 text-[11px] leading-5 text-muted-foreground/70",
          streaming ? "line-clamp-3" : "line-clamp-2",
        )}>
        {text || "…"}
      </p>
    </details>
  );
}

function ScriptText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <ScriptBlock key={index} block={block} />
      ))}
    </div>
  );
}

function ScriptBlock({ block }: { block: string }) {
  const trimmed = block.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("## ")) {
    return (
      <h4 className="font-serif text-sm leading-snug tracking-tight text-base-content">
        {trimmed.slice(3)}
      </h4>
    );
  }

  if (trimmed.startsWith("> ")) {
    return (
      <blockquote className="border-l-2 border-primary/50 pl-3 text-[11px] leading-relaxed text-muted-foreground italic">
        <Inline text={trimmed.slice(2)} />
      </blockquote>
    );
  }

  const lines = trimmed.split("\n");
  if (lines.every((line) => line.startsWith("- "))) {
    return (
      <ul className="space-y-1">
        {lines.map((line, index) => (
          <li
            key={index}
            className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 bg-primary/60" />
            <span>
              <Inline text={line.slice(2)} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      <Inline text={trimmed} />
    </p>
  );
}

/** Just enough markdown for the script: bold, inline code, and stray stream markers. */
function Inline({ text }: { text: string }) {
  const cleaned = text.replace(/\*\*$/, "").replace(/`$/, "");
  const parts = cleaned.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={index} className="font-medium text-base-content">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code key={index} className="bg-primary/10 px-1 font-mono text-[10px] text-primary">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

/** `save_job` → `Save Job`, matching the real tool chip. */
function toolLabel(name: string) {
  return name
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
