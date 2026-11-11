import { useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { HairlineProps } from "@lucasmarkes/hairline/react";

import { cn } from "@/lib/utils";

type Tone = "base" | "primary";

export function Section({
  id,
  tone = "base",
  className,
  dataTest,
  children,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  dataTest?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-test={dataTest}
      className={cn(
        "mx-auto w-full max-w-360 scroll-mt-14 border-x border-border/50",
        tone === "primary" && "bg-primary/[0.04]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
      <h2 className="mt-4 text-balance font-serif text-3xl leading-[1.05] font-medium tracking-tight text-base-content md:text-4xl lg:text-5xl">
        {title}
      </h2>
      {children ? (
        <div className="mt-5 space-y-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function FigurePanel({
  figure: Figure,
  label,
  captionLabel,
  intensity = 0.6,
  play = true,
  className,
}: {
  figure: ComponentType<HairlineProps>;
  label: string;
  captionLabel: string;
  intensity?: number;
  play?: boolean;
  className?: string;
}) {
  const [read, setRead] = useState("");

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-md overflow-hidden border border-border/60 bg-base-100 lg:max-w-none",
        className,
      )}
    >
      <Figure
        intensity={intensity}
        play={play}
        theme="auto"
        label={label}
        onRead={setRead}
        className="w-full"
      />
      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        <span className="truncate">{captionLabel}</span>
        <span className="shrink-0 text-primary tabular-nums">{read || "ready"}</span>
      </div>
    </div>
  );
}

export function FigureSplit({
  id,
  figure,
  label,
  captionLabel,
  intensity = 0.6,
  play = true,
  reverse = false,
  tone = "base",
  children,
}: {
  id?: string;
  figure: ComponentType<HairlineProps>;
  label: string;
  captionLabel: string;
  intensity?: number;
  play?: boolean;
  reverse?: boolean;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <Section id={id} tone={tone} dataTest={id ? `exp-${id}` : undefined}>
      <div className="grid grid-cols-1 items-center gap-10 px-6 py-16 md:px-12 md:py-24 lg:grid-cols-12 lg:gap-0">
        <div className={cn("lg:col-span-5", reverse ? "lg:order-2 lg:pl-12" : "lg:pr-12")}>
          <FigurePanel
            figure={figure}
            label={label}
            captionLabel={captionLabel}
            intensity={intensity}
            play={play}
          />
        </div>
        <div className={cn("lg:col-span-7", reverse ? "lg:order-1" : null)}>{children}</div>
      </div>
    </Section>
  );
}
