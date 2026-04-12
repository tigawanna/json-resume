import { Compass, MapPin, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppConfig } from "@/utils/system";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
  iconBg: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: MapPin,
    title: "File-based routes",
    description: "TanStack Router generates a type-safe route tree from your file structure.",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    icon: Compass,
    title: "End-to-end types",
    description: "Share contracts between client and API with a single monorepo workflow.",
    iconColor: "text-earth-green-400",
    iconBg: "bg-earth-green-400/10",
  },
  {
    icon: Star,
    title: "DX-first tooling",
    description: "Vite+ wraps lint, format, and tests so quality checks stay consistent.",
    iconColor: "text-terracotta",
    iconBg: "bg-terracotta/10",
  },
];

function FeatureCard({ feature, index }: { feature: FeatureItem; index: number }) {
  const Icon = feature.icon;

  return (
    <div
      className="animate-fade-in group relative rounded-2xl border border-border bg-base-200 p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div
        className={`mb-6 inline-flex size-14 items-center justify-center rounded-xl ${feature.iconBg} ${feature.iconColor} transition-transform group-hover:scale-110`}
      >
        <Icon className="size-7" />
      </div>
      <h3 className="mb-3 font-serif text-2xl text-base-content">{feature.title}</h3>
      <p className="leading-relaxed text-base-content/60">{feature.description}</p>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section id="features" className="scroll-mt-20 bg-base-100 py-24">
      <div className="container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-serif text-4xl text-base-content md:text-5xl">
            How <span className="italic text-primary">{AppConfig.name}</span> is structured
          </h2>
          <p className="mx-auto max-w-md text-lg text-base-content/60">
            Three pillars you can extend without rewriting the foundation
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
