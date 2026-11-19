import { isServer } from "@solidjs/web";
import { readStored, writeStored } from "./persistence";

export type Theme = "light" | "dark";

const THEME_KEY = "calcpayekenya:theme";
const THEME_COLOR: Record<Theme, string> = { light: "#fbfbf9", dark: "#0b0d0c" };

export function loadTheme(): Theme {
  return readStored({ key: THEME_KEY }) === "light" ? "light" : "dark";
}

export function saveTheme({ theme }: { theme: Theme }): void {
  writeStored({ key: THEME_KEY, value: theme });
}

export function applyTheme({ theme }: { theme: Theme }): void {
  if (isServer) return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}
