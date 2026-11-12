import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type LegalSection = {
  heading: string;
  body: string;
};

type LegalPath = "/privacy" | "/terms";

type LegalDocumentLayoutProps = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: readonly LegalSection[];
  currentPath: LegalPath;
};

const LEGAL_LINKS: { label: string; to: LegalPath }[] = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];

export function LegalDocumentLayout({
  title,
  lastUpdated,
  intro,
  sections,
  currentPath,
}: LegalDocumentLayoutProps) {
  return (
    <div className="min-h-dvh bg-base-100 text-base-content">
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium tracking-tight">
            <AppConfig.icon className="size-5 text-primary" />
            {AppConfig.wordmark}
          </Link>
          <span className="font-mono text-[11px] text-muted-foreground">Updated {lastUpdated}</span>
        </div>
      </header>

      <nav aria-label="Legal documents" className="border-b border-border/50">
        <div className="mx-auto flex max-w-3xl gap-1 px-6 py-3">
          {LEGAL_LINKS.map((link) => {
            const active = link.to === currentPath;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={
                  active
                    ? "rounded-md bg-primary/15 px-4 py-1.5 text-xs font-medium text-primary"
                    : "rounded-md px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:text-base-content"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <h1 className="mb-4 text-4xl font-medium tracking-tight text-balance">{title}</h1>
        <p className="mb-12 max-w-[62ch] text-base leading-relaxed text-pretty text-muted-foreground">
          {intro}
        </p>
        <div className="space-y-10">
          {sections.map((section) => (
            <LegalSectionBlock key={section.heading} heading={section.heading}>
              {section.body}
            </LegalSectionBlock>
          ))}
        </div>
        <div className="mt-16 border-t border-border/50 pt-8">
          <Link
            to="/"
            className="text-sm text-muted-foreground transition-colors hover:text-base-content"
          >
            ← Back to {AppConfig.name}
          </Link>
        </div>
      </main>
    </div>
  );
}

function LegalSectionBlock({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-medium tracking-tight">{heading}</h2>
      <p className="max-w-[62ch] leading-relaxed text-pretty text-muted-foreground">{children}</p>
    </section>
  );
}
