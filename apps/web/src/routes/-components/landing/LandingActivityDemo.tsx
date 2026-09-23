import { useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKS = 16;

const LEVEL_CLASS = [
  "bg-base-content/10",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
] as const;

function seedLevel(week: number, day: number) {
  const n = (week * 3 + day * 5) % 9;
  if (day === 0 || day === 6) return n > 6 ? 1 : 0;
  if (n < 2) return 0;
  if (n < 4) return 1;
  if (n < 6) return 2;
  if (n < 8) return 3;
  return 4;
}

function initialGrid() {
  return WEEKDAYS.map((_, day) => Array.from({ length: WEEKS }, (_, week) => seedLevel(week, day)));
}

export function LandingActivityDemo() {
  const [grid, setGrid] = useState(initialGrid);
  const [selected, setSelected] = useState<{ day: number; week: number } | null>(null);

  function bump(day: number, week: number) {
    setSelected({ day, week });
    setGrid((current) =>
      current.map((row, dayIndex) =>
        dayIndex === day
          ? row.map((level, weekIndex) => (weekIndex === week ? (level + 1) % LEVEL_CLASS.length : level))
          : row,
      ),
    );
  }

  const total = grid.reduce((sum, row) => sum + row.reduce((rowSum, level) => rowSum + level, 0), 0);
  const selectedLevel =
    selected === null ? null : grid[selected.day]?.[selected.week] ?? null;

  return (
    <div data-test="landing-heatmap" className="border border-border bg-base-100 p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium text-base-content">Local edits</h3>
        <p className="font-mono text-xs text-muted-foreground">{total} this window</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Click a day to record another edit.</p>

      <div className="mt-5 overflow-x-auto">
        <div className="flex gap-2">
          <div className="grid grid-rows-7 gap-1 pt-0">
            {WEEKDAYS.map((label) => (
              <span
                key={label}
                className="flex h-4 items-center font-mono text-xs text-muted-foreground"
              >
                {label.slice(0, 1)}
              </span>
            ))}
          </div>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${WEEKS}, 1rem)`,
              gridAutoRows: "1rem",
            }}
          >
            {WEEKDAYS.map((label, day) =>
              Array.from({ length: WEEKS }, (_, week) => {
                const level = grid[day]?.[week] ?? 0;
                const active = selected?.day === day && selected.week === week;
                return (
                  <button
                    key={`${label}-${week}`}
                    type="button"
                    aria-label={`${label}, week ${week + 1}, ${level} edits`}
                    aria-pressed={active}
                    onClick={() => bump(day, week)}
                    className={`size-4 ${LEVEL_CLASS[level] ?? LEVEL_CLASS[0]} ${active ? "ring-1 ring-base-content" : ""}`}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span>Less</span>
        {LEVEL_CLASS.map((levelClass) => (
          <span key={levelClass} className={`size-4 ${levelClass}`} />
        ))}
        <span>More</span>
        {selected && selectedLevel !== null ? (
          <span className="ml-auto text-base-content">
            {WEEKDAYS[selected.day]} week {selected.week + 1}: {selectedLevel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
