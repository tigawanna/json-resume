import { AlignLeft, Briefcase, Code, FolderKanban, GraduationCap, Mic } from "lucide-react";
import type { PartId } from "./layout";

const ICONS = {
  experience: Briefcase,
  education: GraduationCap,
  summary: AlignLeft,
  project: FolderKanban,
  skills: Code,
  talk: Mic,
} as const;

export function PartCard({ id, label }: { id: PartId; label: string }) {
  const Icon = ICONS[id];

  return (
    <div className="flex w-[7.75rem] items-center gap-2 border border-border bg-base-200 px-2.5 py-2 text-base-content shadow-[inset_-3px_0_0_0_var(--color-primary),0_12px_28px_-18px_var(--color-primary)]">
      <Icon aria-hidden className="size-3.5 shrink-0 text-primary" strokeWidth={1.75} />
      <span className="font-mono text-xs">{label}</span>
    </div>
  );
}
