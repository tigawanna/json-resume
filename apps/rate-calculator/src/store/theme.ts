export type Theme = "light" | "dark";

const THEME_KEY = "calcpayekenya:theme";

const THEME_COLOR: Record<Theme, string> = {
  light: "#fbfbf9",
  dark: "#0b0d0c",
};

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage may be unavailable; the theme still works for this session.
  }
}

/** Mirrors the theme on <html>; guarded so Node-based tests can import the store. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}
