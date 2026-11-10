import {
  ResourceCard,
  ResourceCardActions,
  ResourceCardFooter,
  ResourceCardMedia,
} from "@/components/resource-card";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  coverLetterPreview,
  coverLetterWordCount,
} from "@/data-access-layer/event-sourced/rows/cover-letter-rows";
import type { CoverLetter } from "@/data-access-layer/event-sourced/schemas";
import { Link } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { formatLocaleDate } from "@/utils/date-helpers";

interface CoverLetterCardProps {
  letter: CoverLetter;
  onOpen: () => void;
  onDelete: () => void;
}

export function CoverLetterCard({ letter, onOpen, onDelete }: CoverLetterCardProps) {
  const title = letter.title || "Untitled cover letter";

  return (
    <ResourceCard
      dataTest={`row-${letter.id}`}
      className="h-full"
      link={
        <Link
          to="/cover-letters/$coverLetterId"
          params={{ coverLetterId: letter.id }}
          aria-label={`Open ${title}`}
          data-test={`cover-letter-link-${letter.id}`}
        >
          <span className="sr-only">Open {title}</span>
        </Link>
      }
    >
      <ResourceCardMedia className="h-28 overflow-hidden bg-primary/5 py-3">
        <p className="text-muted-foreground line-clamp-4 text-[11px] leading-relaxed whitespace-pre-wrap">
          {coverLetterPreview(letter.body, 320) || "Empty letter — start writing to see it here."}
        </p>
      </ResourceCardMedia>

      <ResourceCardFooter className="flex items-start justify-between gap-2 py-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            Updated {formatLocaleDate(letter.updatedAt)} · {coverLetterWordCount(letter.body)} words
          </p>
        </div>
        <ResourceCardActions label="Cover letter actions">
          <DropdownMenuItem onSelect={onOpen} data-test="row-edit-btn">
            <Pencil className="text-muted-foreground" /> Open & edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete} data-test="row-delete-btn">
            <Trash2 /> Delete
          </DropdownMenuItem>
        </ResourceCardActions>
      </ResourceCardFooter>
    </ResourceCard>
  );
}
