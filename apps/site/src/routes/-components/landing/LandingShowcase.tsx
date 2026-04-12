interface StatItem {
  number: string;
  label: string;
}

const STATS: StatItem[] = [
  { number: "1", label: "Router" },
  { number: "pnpm", label: "Workspaces" },
  { number: "SSR", label: "TanStack Start" },
];

export function LandingShowcase() {
  return (
    <section id="showcase" className="scroll-mt-20 bg-warm-cream py-24 dark:bg-base-200">
      <div className="container">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <div className="relative">
            <div className="relative">
              <picture>
                <source
                  type="image/webp"
                  srcSet="/cook-portrait-320w.webp 320w, /cook-portrait-480w.webp 480w"
                  sizes="(max-width: 768px) 100vw, 384px"
                />
                <source
                  type="image/jpeg"
                  srcSet="/cook-portrait-320w.jpg 320w, /cook-portrait-480w.jpg 480w"
                  sizes="(max-width: 768px) 100vw, 384px"
                />
                <img
                  src="/cook-portrait-480w.jpg"
                  alt=""
                  className="w-full max-w-sm rounded-2xl shadow-2xl shadow-base-content/10"
                  loading="lazy"
                />
              </picture>
              <div className="absolute -right-4 -bottom-8 md:-right-12">
                <picture>
                  <source
                    type="image/webp"
                    srcSet="/food-bowl-224w.webp 224w, /food-bowl-320w.webp 320w"
                    sizes="(max-width: 768px) 192px, 224px"
                  />
                  <source
                    type="image/jpeg"
                    srcSet="/food-bowl-224w.jpg 224w, /food-bowl-320w.jpg 320w"
                    sizes="(max-width: 768px) 192px, 224px"
                  />
                  <img
                    src="/food-bowl-320w.jpg"
                    alt=""
                    className="w-48 rounded-2xl border-4 border-base-100 shadow-2xl shadow-base-content/10 md:w-56"
                    loading="lazy"
                  />
                </picture>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-6 font-serif text-4xl leading-tight text-base-content md:text-5xl">
              Opinionated <span className="italic text-primary">defaults</span>, flexible escape
              hatches
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-base-content/60">
              Replace placeholder copy, plug in your API client, and keep the same routing and data
              patterns as your app grows.
            </p>

            <div className="grid grid-cols-3 gap-6">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <div className="font-serif text-3xl text-primary">{stat.number}</div>
                  <div className="mt-1 text-sm text-base-content/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
