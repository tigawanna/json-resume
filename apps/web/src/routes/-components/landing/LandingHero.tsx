import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { Link } from "@tanstack/react-router";
import { HeroDiagram } from "./hero-diagram/HeroDiagram";

export function LandingHero() {
  return (
    <section
      data-test="landing-hero"
      className="relative mx-auto max-w-360 overflow-hidden border-x border-border/50 lg:min-h-[calc(100dvh-3rem)]"
    >
      <BackgroundRippleEffect pulse pulseInterval={3200} pulseTarget="random" />
      <div className="pointer-events-none relative z-10 grid grid-cols-1 lg:grid-cols-12 lg:items-center">
        <div className="flex flex-col justify-start gap-8 px-6 pt-10 pb-12 md:px-12 md:pt-14 lg:col-span-5 lg:border-r lg:border-border/50 lg:py-16">
          <div>
            <p className="font-mono text-xs text-primary">Open source</p>
            <h1 className="mt-4 max-w-[22ch] text-balance font-serif text-4xl leading-[1.05] font-medium tracking-tight text-base-content md:text-5xl lg:text-6xl">
              The résumé is the sum of its parts.
            </h1>
          </div>
          <p className="max-w-[36ch] text-pretty text-lg leading-relaxed font-light text-muted-foreground md:text-xl">
            Store each piece on its own, and keep a variation tailored to the role.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="pointer-events-auto bg-primary px-6 py-3 font-mono text-sm font-medium text-primary-content transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Open the editor
            </Link>
          </div>
        </div>

        <div className="px-2 py-6 md:px-6 lg:col-span-7 lg:py-10">
          <HeroDiagram />
        </div>
      </div>
    </section>
  );
}
