const BRIEF_LINE_LABELS: Record<string, string> = {
  skill: "Skill",
  experience_id: "Experience",
  insertion_note: "How to write it",
  source_evidence: "Evidence",
  depth: "How far",
};

/** Older chats stored a brief on the user message. Show that once, above the thread. */
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
