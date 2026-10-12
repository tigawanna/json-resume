import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useDebouncedValue } from "@/hooks/use-debouncer";
import { cn } from "@/lib/utils";
import { searchLocalApplicationAnswers } from "@/routes/_dashboard/-ai/-utils/local-application-answer-tools";
import { listLocalCoverLetters } from "@/routes/_dashboard/-ai/-utils/local-cover-letter-tools";
import { searchLocalLibrary } from "@/routes/_dashboard/-ai/-utils/local-library-tools";
import { listLocalResumes } from "@/routes/_dashboard/-ai/-utils/local-resume-tools";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import {
  AlignLeft,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderGit2,
  GraduationCap,
  List,
  Loader2,
  Mail,
  MessageSquareText,
  Mic,
  Search,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { ATTACH_KINDS, type AttachChipData, type AttachKind } from "./resume-ai-prompt";

const PAGE_SIZE = 20;

const KIND_ICONS = {
  resume: FileText,
  experience: Briefcase,
  experience_bullet: List,
  education: GraduationCap,
  projects: FolderGit2,
  talks: Mic,
  skills: Sparkles,
  summary: AlignLeft,
  cover_letter: Mail,
  application_answer: MessageSquareText,
} satisfies Record<AttachKind, LucideIcon>;

interface AttachRow {
  id: string;
  title: string;
  detail: string;
  onResume: boolean;
}

async function fetchAttachPage(
  db: AppDb,
  kind: AttachKind,
  keyword: string,
  offset: number,
  activeResumeId: string | null,
) {
  if (kind === "resume") {
    const page = await listLocalResumes({ db }, { keyword, offset, limit: PAGE_SIZE });
    return {
      rows: page.resumes.map((resume): AttachRow => ({
        id: resume.id,
        title: resume.name,
        detail: resume.headline || resume.jobLabel,
        onResume: false,
      })),
      total: page.total,
      nextOffset: page.nextOffset,
    };
  }
  if (kind === "cover_letter") {
    const page = await listLocalCoverLetters({ db }, { keyword, offset, limit: PAGE_SIZE });
    return {
      rows: page.coverLetters.map((letter): AttachRow => ({
        id: letter.id,
        title: letter.title,
        detail: letter.preview,
        onResume: false,
      })),
      total: page.total,
      nextOffset: page.nextOffset,
    };
  }
  if (kind === "application_answer") {
    const page = await searchLocalApplicationAnswers({ db }, { keyword, offset, limit: PAGE_SIZE });
    return {
      rows: page.answers.map((row): AttachRow => ({
        id: row.id,
        title: row.question,
        detail: [row.jobLabel, row.answer].filter(Boolean).join(" · "),
        onResume: false,
      })),
      total: page.total,
      nextOffset: page.nextOffset,
    };
  }
  const page = await searchLocalLibrary(
    { db, getActiveResumeId: () => activeResumeId },
    { section: kind, keyword, offset, limit: PAGE_SIZE },
  );
  return {
    rows: page.items.map((item): AttachRow => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      onResume: item.onResume,
    })),
    total: page.total,
    nextOffset: page.nextOffset,
  };
}

interface ResumeAiAttachSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeResumeId: string | null;
  /** Chips already in the message, highlighted in the lists. */
  attachedIds: ReadonlyArray<string>;
  onAttach: (item: AttachChipData) => void;
}

export function ResumeAiAttachSheet({
  open,
  onOpenChange,
  activeResumeId,
  attachedIds,
  onAttach,
}: ResumeAiAttachSheetProps) {
  const [kind, setKind] = useState<AttachKind | null>(null);
  const current = ATTACH_KINDS.find((entry) => entry.kind === kind);

  function handleOpenChange(next: boolean) {
    if (!next) setKind(null);
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        data-test="resume-ai-attach-sheet"
      >
        <SheetHeader className="border-b pr-10">
          <div className="flex items-center gap-2">
            {current ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-ml-2 size-8"
                aria-label="Back to attachment types"
                onClick={() => setKind(null)}
                data-test="resume-ai-attach-back"
              >
                <ChevronLeft className="size-4" />
              </Button>
            ) : null}
            <SheetTitle>
              {current ? `Attach ${current.label.toLowerCase()}` : "Attach context"}
            </SheetTitle>
          </div>
          <SheetDescription>
            {current
              ? "Pick items to reference in your message. The assistant works with them directly."
              : "Point the assistant at a résumé, past cover letters or answers, or items from your library."}
          </SheetDescription>
        </SheetHeader>
        {current ? (
          <AttachList
            key={current.kind}
            kind={current.kind}
            label={current.label}
            activeResumeId={activeResumeId}
            attachedIds={attachedIds}
            onAttach={(item) => {
              onAttach(item);
              handleOpenChange(false);
            }}
          />
        ) : (
          <ul className="flex flex-col gap-1 p-2" data-test="resume-ai-attach-types">
            {ATTACH_KINDS.map((entry) => {
              const Icon = KIND_ICONS[entry.kind];
              return (
                <li key={entry.kind}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-base-content/5"
                    onClick={() => setKind(entry.kind)}
                    data-test={`resume-ai-attach-type-${entry.kind}`}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-200 text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium">{entry.label}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface AttachListProps {
  kind: AttachKind;
  label: string;
  activeResumeId: string | null;
  attachedIds: ReadonlyArray<string>;
  onAttach: (item: AttachChipData) => void;
}

function AttachList({ kind, label, activeResumeId, attachedIds, onAttach }: AttachListProps) {
  const db = useEventSourcedDb();
  const [search, setSearch] = useState("");
  const { debouncedValue: keyword, isDebouncing } = useDebouncedValue(search.trim(), 250);
  const Icon = KIND_ICONS[kind];

  const query = useInfiniteQuery({
    queryKey: ["resume-ai-attach", kind, keyword, activeResumeId],
    queryFn: ({ pageParam }) => fetchAttachPage(db, kind, keyword, pageParam, activeResumeId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const attached = new Set(attachedIds);

  return (
    <>
      <div className="flex flex-col gap-2 border-b p-4">
        <div className="relative">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={`Search ${label.toLowerCase()}…`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pr-9 pl-9"
            aria-label={`Search ${label.toLowerCase()}`}
            data-test="resume-ai-attach-search"
          />
          {search ? (
            <button
              type="button"
              className="absolute top-2.5 right-3 text-muted-foreground hover:text-base-content"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          {isDebouncing || query.isFetching ? <Loader2 className="size-3 animate-spin" /> : null}
          {keyword
            ? `${total} match${total === 1 ? "" : "es"} for “${keyword}”`
            : `${total} item${total === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" data-test={`resume-ai-attach-list-${kind}`}>
        {query.isPending ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : query.isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <p className="text-center text-sm text-muted-foreground">Failed to load items.</p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {keyword ? "No matches. Try fewer or different words." : "Nothing here yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1 p-2">
            {rows.map((row) => {
              const isAttached = attached.has(row.id);
              const isActiveResume = kind === "resume" && row.id === activeResumeId;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={isActiveResume}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-base-content/5 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent",
                      isAttached && "bg-primary/10",
                    )}
                    onClick={() => onAttach({ kind, id: row.id, name: row.title })}
                    data-test={`resume-ai-attach-option-${row.id}`}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        isAttached
                          ? "bg-primary/15 text-primary"
                          : "bg-base-200 text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className="line-clamp-2 min-w-0 text-sm leading-tight font-medium">
                          {row.title || "Untitled"}
                        </span>
                        {isActiveResume ? (
                          <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
                            Active
                          </Badge>
                        ) : row.onResume ? (
                          <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                            On résumé
                          </Badge>
                        ) : null}
                      </span>
                      {row.detail ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                          {row.detail}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {query.hasNextPage ? (
        <div className="flex items-center justify-between gap-2 border-t px-4 py-2">
          <span className="text-xs text-muted-foreground">
            {rows.length} of {total}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
            data-test="resume-ai-attach-load-more"
          >
            {query.isFetchingNextPage ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      ) : null}
    </>
  );
}
