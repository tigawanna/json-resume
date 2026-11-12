import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Terrain } from "@/components/ui/hairline";
import { BRAND, STATS } from "./content";
import { Section } from "./primitives";

export function LandingHero() {
  return (
    <Section className="relative overflow-hidden" dataTest="landing-hero">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-end"
        >
          <Terrain
            play
            intensity={0.7}
            theme="auto"
            label=""
            className="w-[min(40rem,92%)] mask-[linear-gradient(90deg,transparent,black_28%)]"
            style={
              {
                "--hairline-hi": "var(--foreground)",
                "--hairline-edge": "color-mix(in oklab, var(--foreground) 55%, transparent)",
                "--hairline-mid": "color-mix(in oklab, var(--foreground) 28%, transparent)",
                "--hairline-lo": "color-mix(in oklab, var(--foreground) 14%, transparent)",
              } as CSSProperties
            }
          />
        </div>

        <div className="relative z-10 flex flex-col justify-center gap-8 px-6 pt-16 pb-12 md:px-12 md:pt-24 lg:max-w-184 lg:py-28">
          <p className="font-mono text-[11px] tracking-[0.18em] text-primary uppercase">
            A free résumé builder for developers
          </p>
          <h1 className="max-w-[14ch] font-serif text-6xl leading-[0.9] font-medium tracking-tight text-base-content md:text-7xl lg:text-8xl">
            Your
            <br />
            career brain.
          </h1>

          <div className="flex max-w-[48ch] flex-col gap-4 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            <p>
              {BRAND} is a career brain that improves itself. Add a job description and it reads the
              opening, fits the parts of your history that belong, and keeps the demands it has
              never seen before: a skill, a responsibility, a way of saying the work. From that same
              posting it builds a résumé aimed at the role, ready to export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="group flex items-center gap-2 bg-primary px-6 py-3 font-mono text-sm font-medium text-primary-content transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Open the editor
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how"
              className="border border-border/60 px-6 py-3 font-mono text-sm text-base-content transition-colors hover:border-primary/40 hover:text-primary"
            >
              See how it works
            </a>
          </div>

          <p className="font-mono text-[11px] text-muted-foreground">
            Free for developers · ATS-friendly PDF · MIT licensed · No account required
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-border/50 md:grid-cols-3">
        {STATS.map((stat, index) => {
          const wrapped = index > 0 && index % 2 === 0;
          return (
            <div
              key={stat.label}
              className={
                "px-5 py-5 md:px-6 " +
                (index > 0 && !wrapped ? "border-l border-border/50 " : "") +
                (wrapped ? "border-t border-border/50 md:border-t-0 md:border-l " : "")
              }
            >
              <p className="font-mono text-xs font-medium tracking-tight text-base-content">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
