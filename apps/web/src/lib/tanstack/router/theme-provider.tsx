import { createContext, use, useLayoutEffect, useMemo, useState } from "react";
import { FunctionOnce } from "./function-once";

export type ResolvedTheme = "dark" | "light";
export type Theme = ResolvedTheme | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const isBrowser = typeof window !== "undefined";

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.setAttribute("data-theme", resolved);
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "agentic-json-resume.theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (isBrowser ? (localStorage.getItem(storageKey) as Theme) : defaultTheme) || defaultTheme,
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const resolved = resolveTheme(theme);
      applyResolvedTheme(resolved);
      setResolvedTheme(resolved);
    }

    mediaQuery.addEventListener("change", applyTheme);
    applyTheme();

    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (newTheme: Theme) => {
        localStorage.setItem(storageKey, newTheme);
        const resolved = resolveTheme(newTheme);

        const apply = () => {
          applyResolvedTheme(resolved);
          setResolvedTheme(resolved);
          setTheme(newTheme);
        };

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduceMotion && typeof document.startViewTransition === "function") {
          document.startViewTransition(apply);
          return;
        }

        apply();
      },
    }),
    [theme, resolvedTheme, storageKey],
  );

  return (
    <ThemeProviderContext value={value}>
      <FunctionOnce param={storageKey}>
        {(key) => {
          const stored: string | null = localStorage.getItem(key as string);
          const isDark =
            stored === "dark" ||
            ((stored === null || stored === "system") &&
              window.matchMedia("(prefers-color-scheme: dark)").matches);
          const resolved = isDark ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", resolved);
          document.documentElement.classList.add(resolved);
        }}
      </FunctionOnce>
      {children}
    </ThemeProviderContext>
  );
}

export function useThemeContext() {
  const context = use(ThemeProviderContext);
  if (context === undefined) throw new Error("useThemeContext must be used within a ThemeProvider");
  return context;
}
