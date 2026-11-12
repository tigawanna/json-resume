import { Link } from "@tanstack/react-router";

import { AppConfig } from "@/utils/system";

import { BRAND, FOOTER_COLUMNS } from "../-utils/content";

export function ExpFooter() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto w-full max-w-360 border-x border-border/50">
        <div className="grid grid-cols-1 gap-10 px-6 py-12 md:grid-cols-12 md:px-12 md:py-16">
          <div className="md:col-span-6">
            <Link to="/" aria-label={AppConfig.name} className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center bg-primary/10 text-primary ring-1 ring-primary/40">
                <AppConfig.icon className="size-4" />
              </span>
              <span className="font-mono text-xs font-medium tracking-[0.2em] text-base-content uppercase">
                {BRAND}
              </span>
            </Link>
            <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
              A career brain for your résumé, cover letters and applications. Structured JSON,
              tailored with any LLM, exported as an ATS-friendly PDF. Open source and local-first.
            </p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Built with TanStack Start · MIT
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className="md:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-base-content"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border/50 px-6 py-4 font-mono text-[10px] text-muted-foreground md:flex-row md:items-center md:justify-between md:px-12">
          <span>
            © {new Date().getFullYear()} {BRAND}
          </span>
          <span className="flex gap-4">
            <Link to="/privacy" className="transition-colors hover:text-base-content">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-base-content">
              Terms
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
