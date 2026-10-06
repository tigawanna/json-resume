import { DiagramLinks } from "./DiagramLinks";
import { BRACES, CUBE_AT, PARTS, RESUME_AT } from "./layout";
import { PartCard } from "./PartCard";
import { ResumeStack } from "./ResumeStack";

function placed(x: number, y: number) {
  return { left: `${x}%`, top: `${y}%` };
}

export function HeroDiagram() {
  return (
    <div data-test="landing-hero-diagram">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 md:hidden">
        <ul className="flex flex-col gap-2">
          {PARTS.map((part, index) => (
            <li
              key={part.id}
              className="hero-part-float"
              style={{ animationDelay: `${index * 0.45}s` }}
            >
              <PartCard id={part.id} label={part.label} />
            </li>
          ))}
        </ul>
        <div className="pr-3 pb-3">
          <ResumeStack />
        </div>
      </div>

      <div
        className="relative mx-auto hidden aspect-[6/5] w-full max-w-3xl md:block"
        role="img"
        aria-label="A résumé linked to experience, education, summary, project, skills, and a talk"
      >
        <DiagramLinks />

        {BRACES.map((brace) => (
          <span
            key={`${brace.x}-${brace.y}`}
            aria-hidden
            className="absolute -translate-x-1/2 -translate-y-1/2 font-mono text-lg text-primary"
            style={placed(brace.x, brace.y)}
          >
            {"{ }"}
          </span>
        ))}

        <div
          aria-hidden
          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 bg-base-content shadow-[0_0_18px_var(--color-primary)]"
          style={placed(CUBE_AT.x, CUBE_AT.y)}
        />

        {PARTS.map((part, index) => (
          <div
            key={part.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={placed(part.x, part.y)}
          >
            <div className="hero-part-float" style={{ animationDelay: `${index * 0.45}s` }}>
              <PartCard id={part.id} label={part.label} />
            </div>
          </div>
        ))}

        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={placed(RESUME_AT.x, RESUME_AT.y)}
        >
          <div className="hero-part-float" style={{ animationDelay: "0.2s" }}>
            <ResumeStack />
          </div>
        </div>
      </div>
    </div>
  );
}
