import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/tanstack/router/use-theme";
import { AppConfig } from "@/utils/system";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { lazy, Suspense, useState } from "react";

const DashboardLink = lazy(() => import("./LandingDashboardLink"));

const NAV_LINKS = [
  { label: "Workflow", href: "#features" },
  { label: "Why JSON", href: "#showcase" },
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
        console.error("view transition not supprted")
      }
    }
    updateTheme(newTheme);
  }

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-base-100/10 dark:border-base-content/10">
      <div className="container flex h-16 items-center justify-between">
        <Link
          to="/"
          className="font-serif text-2xl tracking-tight text-base-100 dark:text-base-content">
          {AppConfig.wordmark}
          <span className="text-primary">.</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm text-base-100/70 transition-colors hover:text-base-100 dark:text-base-content/70 dark:hover:text-base-content">
              {item.label}
            </a>
          ))}
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-base-100/70 transition-colors hover:text-base-100 dark:text-base-content/70 dark:hover:text-base-content"
            aria-label="Toggle theme">
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
          <Link to="/auth/signup" search={{ returnTo: "/dashboard" }}>
            <Button size="sm" variant="ghost" className="rounded-full px-4">
              Sign up
            </Button>
          </Link>
          <Suspense
            fallback={
              <Link to="/auth" search={{ returnTo: pathname }}>
                <Button size="sm" className="rounded-full px-6">
                  Get started
                </Button>
              </Link>
            }>
            <DashboardLink />
          </Suspense>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-base-100/70 transition-colors hover:text-base-100 dark:text-base-content/70 dark:hover:text-base-content"
            aria-label="Toggle theme">
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-base-100 dark:text-base-content"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}>
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="space-y-4 border-t border-base-100/10 bg-base-content/80 p-6 backdrop-blur-xl dark:border-base-content/10 dark:bg-base-100/80 md:hidden">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block text-base-100/70 transition-colors hover:text-base-100 dark:text-base-content/70 dark:hover:text-base-content">
              {item.label}
            </a>
          ))}
          <Link
            to="/auth/signup"
            search={{ returnTo: "/dashboard" }}
            onClick={() => setMobileOpen(false)}>
            <Button variant="outline" className="w-full rounded-full">
              Sign up
            </Button>
          </Link>
          <Link to="/auth" search={{ returnTo: pathname }}>
            <Button className="w-full rounded-full">Get started</Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
