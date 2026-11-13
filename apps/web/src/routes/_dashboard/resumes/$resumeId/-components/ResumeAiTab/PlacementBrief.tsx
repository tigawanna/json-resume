import { Input } from "@/components/ui/input";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { resumeLayoutSchema } from "@/features/resume/resume-layout";
import { cn } from "@/lib/utils";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useEffect, useState } from "react";
import {
  DEFAULT_PLACEMENT_BRIEF,
  formatPlacementBrief,
  type PlacementBrief,
  type PlacementDepth,
  type PlacementInsertion,
} from "./placement-brief";

interface Choice {
  id: string;
  label: string;
}

function ChoiceRow({
  legend,
  choices,
  value,
  onChange,
  multiple = false,
  otherValue,
  onOtherChange,
  otherPlaceholder,
  testId,
}: {
  legend: string;
  choices: Choice[];
  value: string | string[];
  onChange: (id: string) => void;
  /** Several concrete choices can stay selected. The first choice clears the rest. */
  multiple?: boolean;
  otherValue: string;
  onOtherChange: (value: string) => void;
  otherPlaceholder: string;
  testId: string;
}) {
  const selectedIds = Array.isArray(value) ? value : [value];
  return (
    <fieldset className="flex flex-col gap-1.5" data-test={testId}>
      <legend className="text-xs font-medium text-base-content">{legend}</legend>
      <div className="flex flex-wrap gap-1.5" role={multiple ? "group" : undefined}>
        {choices.map((choice) => {
          const selected = selectedIds.includes(choice.id);
          return (
            <button
              key={choice.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(choice.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-left text-xs transition-colors",
                selected
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-base-content/15 text-base-content/70 hover:border-base-content/30 hover:text-base-content",
              )}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
      {selectedIds.includes("other") ? (
        <Input
          value={otherValue}
          onChange={(event) => onOtherChange(event.target.value)}
          placeholder={otherPlaceholder}
          aria-label={`${legend}: other`}
          className="h-8 text-xs"
          data-test={`${testId}-other`}
        />
      ) : null}
    </fieldset>
  );
}

/** Early questions for a tailor: how far, which skill, which experience, how to write it in. */
export function PlacementBriefFields({
  resumeId,
  open,
  onBriefChange,
}: {
  resumeId: string | null;
  /** Open on a new chat so the questions show up before the first edit. */
  open: boolean;
  onBriefChange: (text: string) => void;
}) {
  const db = useEventSourcedDb();
  const [brief, setBrief] = useState<PlacementBrief>(DEFAULT_PLACEMENT_BRIEF);

  const { data: resumeRows } = useLiveQuery(
    (query) =>
      resumeId
        ? query
            .from({ resume: db.collections.resume })
            .where(({ resume }) => eq(resume.id, resumeId))
            .select(({ resume }) => ({ layout: resume.layout }))
        : undefined,
    [db, resumeId],
  );
  const layout = resumeLayoutSchema.safeParse(resumeRows?.[0]?.layout);
  const experienceIds = (
    layout.success ? layout.data.experiences.map((entry) => entry.id) : []
  ).slice(0, 8);
  const skillIds = [
    ...new Set(layout.success ? layout.data.skillGroups.flatMap((group) => group.skills) : []),
  ].slice(0, 12);

  const { data: experienceRows } = useLiveQuery(
    (query) =>
      query
        .from({ row: db.collections.resumeExperience })
        .select(({ row }) => ({ id: row.id, company: row.company, role: row.role })),
    [db],
  );
  const { data: skillRows } = useLiveQuery(
    (query) =>
      query.from({ row: db.collections.resumeSkill }).select(({ row }) => ({
        id: row.id,
        name: row.name,
      })),
    [db],
  );

  const experienceById = new Map((experienceRows ?? []).map((row) => [row.id, row]));
  const skillById = new Map((skillRows ?? []).map((row) => [row.id, row]));

  const experienceChoices: Choice[] = [
    { id: "auto", label: "Let it pick an honest home" },
    ...experienceIds.flatMap((id) => {
      const row = experienceById.get(id);
      if (!row) return [];
      const label = [row.role, row.company].filter(Boolean).join(" at ") || id;
      return [{ id, label }];
    }),
    { id: "other", label: "Other" },
  ];

  const skillChoices: Choice[] = [
    { id: "none", label: "No specific skill" },
    ...skillIds.flatMap((id) => {
      const row = skillById.get(id);
      if (!row?.name.trim()) return [];
      return [{ id, label: row.name }];
    }),
    { id: "other", label: "Other" },
  ];

  const depthChoices: Choice[] = [
    { id: "honest", label: "Keep it honest" },
    { id: "all-in", label: "Go all in" },
    { id: "other", label: "Other" },
  ];
  const insertionChoices: Choice[] = [
    { id: "weave", label: "Weave into an existing bullet" },
    { id: "new-bullet", label: "New bullet only if the role did this" },
    { id: "skills-list", label: "Skills list only" },
    { id: "other", label: "Other" },
  ];

  function patch(next: Partial<PlacementBrief>) {
    setBrief((current) => ({ ...current, ...next }));
  }

  function toggleMany(current: string[], id: string, clearId: string) {
    if (id === clearId) return [clearId];
    const withoutClear = current.filter((choice) => choice !== clearId);
    const next = withoutClear.includes(id)
      ? withoutClear.filter((choice) => choice !== id)
      : [...withoutClear, id];
    return next.length > 0 ? next : [clearId];
  }

  const preview = formatPlacementBrief(resolvedBrief(brief, experienceById, skillById));

  useEffect(() => {
    onBriefChange(preview);
  }, [onBriefChange, preview]);

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-base-content/15 bg-base-200/40 px-3 py-3"
      data-test="resume-ai-placement-brief"
      data-open={open ? "true" : "false"}
    >
      <div>
        <p className="text-xs font-medium text-base-content">Placement brief</p>
        <p className="text-xs text-muted-foreground">
          How far to tailor, which skill, and where it goes
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <ChoiceRow
          legend="How far should this go?"
          choices={depthChoices}
          value={brief.depth}
          onChange={(id) => patch({ depth: id as PlacementDepth })}
          otherValue={brief.depthNote}
          onOtherChange={(depthNote) => patch({ depthNote })}
          otherPlaceholder="Describe how far to take it"
          testId="placement-depth"
        />
        <ChoiceRow
          legend="Which skill should be placed?"
          choices={skillChoices}
          multiple
          value={brief.skillChoices}
          onChange={(id) => patch({ skillChoices: toggleMany(brief.skillChoices, id, "none") })}
          otherValue={brief.skillNote}
          onOtherChange={(skillNote) => patch({ skillNote })}
          otherPlaceholder="Name the skill"
          testId="placement-skill"
        />
        <ChoiceRow
          legend="Which experience should it land on?"
          choices={experienceChoices}
          multiple
          value={brief.experienceChoices}
          onChange={(id) =>
            patch({ experienceChoices: toggleMany(brief.experienceChoices, id, "auto") })
          }
          otherValue={brief.experienceNote}
          onOtherChange={(experienceNote) => patch({ experienceNote })}
          otherPlaceholder="Name the role or company"
          testId="placement-experience"
        />
        <ChoiceRow
          legend="How should it be written in?"
          choices={insertionChoices}
          value={brief.insertion}
          onChange={(id) => patch({ insertion: id as PlacementInsertion })}
          otherValue={brief.insertionNote}
          onOtherChange={(insertionNote) => patch({ insertionNote })}
          otherPlaceholder="How the line should read"
          testId="placement-insertion"
        />
      </div>
    </div>
  );
}

const BRIEF_LINE_LABELS: Record<string, string> = {
  skill: "Skill",
  experience_id: "Experience",
  insertion_note: "How to write it",
  source_evidence: "Evidence",
  depth: "How far",
};

/** Answered brief, left in the transcript so later messages push it upward. */
export function PlacementBriefCard({ text }: { text: string }) {
  const lines = text.split("\n").flatMap((line) => {
    const match = line.match(/^- ([a-z_]+): (.*)$/);
    if (!match) return [];
    const label = BRIEF_LINE_LABELS[match[1]];
    if (!label) return [];
    return [{ label, value: match[2] }];
  });

  return (
    <div
      className="mx-auto w-full max-w-3xl rounded-2xl border border-base-content/15 bg-base-200/40 px-3 py-3"
      data-test="resume-ai-placement-brief-card"
    >
      <p className="text-xs font-medium text-base-content">Placement brief</p>
      <dl className="mt-2 flex flex-col gap-1.5">
        {lines.map((line) => (
          <div key={line.label} className="grid grid-cols-[7.5rem_1fr] gap-2 text-xs">
            <dt className="text-muted-foreground">{line.label}</dt>
            <dd className="text-base-content/90">{line.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function resolvedBrief(
  brief: PlacementBrief,
  experiences: Map<string, { company: string; role: string }>,
  skills: Map<string, { name: string }>,
): PlacementBrief {
  const skillLabel = brief.skillChoices
    .flatMap((id) => {
      const skill = skills.get(id);
      return skill?.name ? [skill.name] : [];
    })
    .join(", ");
  const experienceLabel = brief.experienceChoices
    .flatMap((id) => {
      const experience = experiences.get(id);
      if (!experience) return [];
      const label = [experience.role, experience.company].filter(Boolean).join(" at ");
      return [`${label} (id: ${id})`];
    })
    .join("; ");
  return {
    ...brief,
    skillLabel: skillLabel || brief.skillLabel,
    experienceLabel: experienceLabel || brief.experienceLabel,
  };
}
