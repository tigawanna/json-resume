import { useTheme } from "@/lib/tanstack/router/use-theme";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {}

export function ThemeToggle({}: ThemeToggleProps) {
  const { theme, updateTheme } = useTheme();

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      try {
        (document as any).startViewTransition(() => updateTheme(newTheme));
        return;
      } catch {}
    }
    updateTheme(newTheme);
  }

  return (
    <div data-test="theme-toggle" className="flex items-center justify-between gap-2">
      <div className="hidden md:flex">
        {import.meta.env.DEV && (
          <select
            className="select select-bordered select-sm max-w-xs"
            onChange={(e) => (document.documentElement.dataset.style = e.target.value)}
          >
            <option value="default">Default</option>
            <option value="vertical">Vertical</option>
            <option value="wipe">Wipe</option>
            <option value="angled">Angled</option>
            <option value="flip">Flip</option>
            <option value="slides">Slides</option>
          </select>
        )}
      </div>
      <button onClick={toggleTheme} data-test="theme-toggle-button" className="btn">
        {theme === "light" ? <Moon /> : <Sun />}
      </button>
    </div>
  );
}
