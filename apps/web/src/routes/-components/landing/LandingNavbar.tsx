import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { useTheme } from "@/lib/tanstack/router/use-theme";
import { AppConfig } from "@/utils/system";

import { BRAND, NAV_LINKS } from "./content";

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, updateTheme } = useTheme();

  function toggleTheme() {
    updateTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <header
      data-test="landing-navbar"
      className="sticky top-0 z-50 border-b border-border/50 bg-base-100/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 w-full max-w-360 items-center justify-between border-x border-border/50 px-4 md:px-6">
        <Link to="/" aria-label={AppConfig.name} className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center bg-primary/10 text-primary ring-1 ring-primary/40">
            <AppConfig.icon className="size-4" />
          </span>
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-xs font-medium tracking-[0.2em] text-base-content uppercase">
              {BRAND}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:text-base-content"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="hidden border border-border/60 px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-base-content sm:block"
          >
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <a
            href="#pricing"
            className="hidden border border-border/60 px-4 py-2 font-mono text-xs text-base-content transition-colors hover:border-primary/40 md:block"
          >
            Talk to us
          </a>
          <Link
            to="/dashboard"
            className="bg-primary px-4 py-2 font-mono text-xs font-medium text-primary-content transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            Open the editor
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="border border-border/60 p-2 text-base-content lg:hidden"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border/50 bg-base-100/95 backdrop-blur-xl lg:hidden">
          <nav
            className="mx-auto grid max-w-360 gap-1 border-x border-border/50 px-4 py-4"
            aria-label="Mobile"
          >
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-2 py-2 font-mono text-sm text-muted-foreground transition-colors hover:text-base-content"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex-1 border border-border/60 px-3 py-2 font-mono text-xs text-muted-foreground"
              >
                {theme === "light" ? "Dark mode" : "Light mode"}
              </button>
              <a
                href="#pricing"
                onClick={() => setMobileOpen(false)}
                className="flex-1 border border-border/60 px-3 py-2 text-center font-mono text-xs text-base-content"
              >
                Talk to us
              </a>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
