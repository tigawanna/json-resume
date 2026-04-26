import { useTheme } from "@/lib/tanstack/router/use-theme";
import { AppConfig } from "@/utils/system";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { lazy, Suspense, useState } from "react";

const DashboardLink = lazy(() => import("./LandingDashboardLink"));

const NAV_LINKS = [
  { label: "Pipeline", href: "#pipeline" },
  { label: "Features", href: "#features" },
] as const;

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { theme, updateTheme } = useTheme();

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      try {
        document.startViewTransition(() => updateTheme(newTheme));
        return;
      } catch {
        console.error("view transition not supported");
      }
    }
    updateTheme(newTheme);
  }

  return (
    <header
      data-test="landing-navbar"
      className="sticky top-0 z-50 border-b border-border/50 bg-base-100/80 backdrop-blur-md transition-all duration-300"
    >
      <div className="mx-auto flex h-12 max-w-360 items-center justify-between border-x border-border/50">
        {/* Logo */}
        <Link to="/" className="flex h-full items-center border-r border-border/50 px-6">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-base-content">
            {AppConfig.wordmark}
            <span className="text-primary">.</span>
          </span>
        </Link>

        {/* Status indicator — desktop */}
        <div className="hidden flex-1 items-center gap-6 border-r border-border/50 px-6 font-mono text-xs text-muted-foreground md:flex">
          <div className="flex items-center gap-2">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            <span>JSON → LLM → PDF</span>
          </div>
        </div>

        {/* Right actions — desktop */}
        <div className="flex h-full items-center">
          <button
            onClick={toggleTheme}
            className="hidden h-full border-l border-border/50 px-4 font-mono text-xs text-muted-foreground transition-colors hover:text-base-content sm:block"
            aria-label="Toggle theme"
          >
            {theme === "light" ? "[ Dark ]" : "[ Light ]"}
          </button>

          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="hidden h-full items-center border-l border-border/50 px-4 font-mono text-xs text-muted-foreground transition-colors hover:text-base-content md:flex"
            >
              [ {item.label} ]
            </a>
          ))}

          <Suspense
            fallback={
              <Link
                to="/auth"
                search={{ returnTo: pathname }}
                className="flex h-full items-center bg-primary px-6 font-mono text-xs uppercase tracking-widest text-primary-content transition-opacity hover:opacity-90"
              >
                Get Started →
              </Link>
            }
          >
            <DashboardLink />
          </Suspense>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-full items-center border-l border-border/50 px-4 text-base-content md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="space-y-3 border-t border-border/50 bg-base-100/95 p-6 font-mono text-xs backdrop-blur-xl md:hidden">
          <button
            onClick={() => {
              toggleTheme();
              setMobileOpen(false);
            }}
            className="block text-muted-foreground transition-colors hover:text-base-content"
          >
            {theme === "light" ? "[ Dark mode ]" : "[ Light mode ]"}
          </button>
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block text-muted-foreground transition-colors hover:text-base-content"
            >
              [ {item.label} ]
            </a>
          ))}
          <Link
            to="/auth/signup"
            search={{ returnTo: "/dashboard" }}
            onClick={() => setMobileOpen(false)}
            className="block text-muted-foreground transition-colors hover:text-base-content"
          >
            [ Sign up ]
          </Link>
          <Link
            to="/auth"
            search={{ returnTo: pathname }}
            onClick={() => setMobileOpen(false)}
            className="mt-3 block bg-primary px-4 py-2 text-center uppercase tracking-widest text-primary-content"
          >
            Get Started →
          </Link>
        </div>
      )}
    </header>
  );
}
