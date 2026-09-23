import { useState } from "react";

const PIECES = [
  {
    id: "exp",
    kind: "Experience",
    title: "Ledger team",
    note: "Staff engineer, payments",
    width: "w-full max-w-md",
    studs: 4,
    locksTo: "proj",
  },
  {
    id: "proj",
    kind: "Project",
    title: "Reconciliation job",
    note: "Shipped from that role",
    width: "w-[92%] max-w-sm",
    studs: 3,
    locksTo: "talk",
  },
  {
    id: "talk",
    kind: "Talk",
    title: "Month-end close",
    note: "Given about that project",
    width: "w-[84%] max-w-xs",
    studs: 2,
    locksTo: null,
  },
] as const;

function BrickStuds({ count }: { count: number }) {
  return (
    <div className="absolute -top-2.5 left-4 flex gap-2.5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="size-4 rounded-[2px] border border-primary/50 bg-primary/30 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--color-primary)_55%,transparent)]"
        />
      ))}
    </div>
  );
}

export function LandingFeatures() {
  const [active, setActive] = useState<string | null>("exp");
  const activePiece = PIECES.find((piece) => piece.id === active) ?? null;
  const lockedIds = new Set(
    activePiece
      ? [activePiece.id, ...(activePiece.locksTo ? [activePiece.locksTo] : [])]
      : [],
  );
  if (activePiece?.locksTo) {
    const next = PIECES.find((piece) => piece.id === activePiece.locksTo);
    if (next?.locksTo) lockedIds.add(next.locksTo);
  }

  return (
    <section
      id="parts"
      data-test="landing-pipeline"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50"
    >
      <div className="bg-base-200/70 px-6 py-20 md:px-16 md:py-28">
        <h2 className="max-w-[18ch] text-balance text-3xl font-medium tracking-tight text-base-content md:text-4xl">
          The pieces point at each other.
        </h2>
        <p className="mt-6 max-w-[62ch] text-pretty text-base leading-relaxed text-muted-foreground">
          An experience can name the project that came out of it. The project can name the talk you
          gave about the work. Education, skills, certifications, summaries, and notes live in the
          same library, each as its own record. A later résumé pulls a subset. The records you
          leave out stay where they are, ready for a different role.
        </p>

        <div
          data-test="landing-lego-pieces"
          className="mt-14 grid grid-cols-1 items-start gap-10 lg:grid-cols-12"
        >
          <div className="relative lg:col-span-7">
            <p className="mb-8 font-mono text-xs text-muted-foreground">Assembled from the library</p>

            <div className="relative mx-auto max-w-lg overflow-visible border border-border bg-base-100 px-5 pt-10 pb-8 md:px-8">
              <div className="pointer-events-none absolute inset-x-5 top-3 flex justify-between font-mono text-[10px] text-muted-foreground md:inset-x-8">
                <span>résumé.json</span>
                <span>3 blocks</span>
              </div>

              <ol className="relative mt-2 flex flex-col items-center">
                {PIECES.map((piece, index) => {
                  const isLit = lockedIds.has(piece.id);
                  const prev = index > 0 ? PIECES[index - 1] : null;
                  return (
                    <li
                      key={piece.id}
                      className={`relative ${piece.width} ${index > 0 ? "-mt-1" : ""} ${
                        index === 0 ? "z-30" : index === 1 ? "z-20" : "z-10"
                      }`}
                    >
                      {prev ? (
                        <div
                          className={`absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center ${
                            isLit && lockedIds.has(prev.id) ? "text-primary" : "text-muted-foreground"
                          }`}
                          aria-hidden
                        >
                          <span className="h-3 w-px bg-current" />
                          <span className="font-mono text-[9px] leading-none">snap</span>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        aria-pressed={active === piece.id}
                        onClick={() => setActive(piece.id)}
                        className={`relative w-full border-2 px-4 pt-5 pb-4 text-left transition-colors active:scale-[0.99] ${
                          isLit
                            ? "border-primary bg-primary/15"
                            : "border-border bg-base-200 hover:border-primary/40"
                        }`}
                      >
                        <BrickStuds count={piece.studs} />
                        <div className="font-mono text-xs text-primary">{piece.kind}</div>
                        <div className="mt-1 text-lg font-medium tracking-tight text-base-content">
                          {piece.title}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{piece.note}</p>
                        {piece.locksTo ? (
                          <span className="mt-3 inline-block font-mono text-[10px] text-muted-foreground">
                            locks → {PIECES.find((p) => p.id === piece.locksTo)?.kind}
                          </span>
                        ) : (
                          <span className="mt-3 inline-block font-mono text-[10px] text-muted-foreground">
                            end of chain
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="lg:col-span-5 lg:pt-10">
            <p className="font-mono text-xs text-muted-foreground">Click a brick</p>
            {activePiece ? (
              <div className="mt-4 border border-border bg-base-100 p-5">
                <p className="font-mono text-xs text-primary">{activePiece.kind}</p>
                <p className="mt-2 text-xl font-medium tracking-tight text-base-content">
                  {activePiece.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {activePiece.note}. In the library this is its own record. In a résumé it only
                  appears when you snap it in.
                </p>
                <ul className="mt-5 space-y-2">
                  {PIECES.map((piece) => {
                    const inChain = lockedIds.has(piece.id);
                    return (
                      <li
                        key={piece.id}
                        className={`flex items-center gap-3 border px-3 py-2 font-mono text-xs ${
                          inChain
                            ? "border-primary/40 bg-primary/10 text-base-content"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`size-2.5 rounded-[1px] ${inChain ? "bg-primary" : "bg-base-content/20"}`}
                          aria-hidden
                        />
                        {piece.kind}
                        {piece.id === activePiece.id ? (
                          <span className="ml-auto text-primary">selected</span>
                        ) : inChain ? (
                          <span className="ml-auto">linked</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
