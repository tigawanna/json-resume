export const LANGUAGE_SELECT_NONE = "__none__" as const;
export const LANGUAGE_SELECT_CUSTOM = "__custom__" as const;

export const POPULAR_GITHUB_LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C#",
  "C++",
  "C",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Scala",
  "Dart",
  "HTML",
  "CSS",
  "Shell",
  "PowerShell",
  "Vue",
  "SQL",
  "R",
  "MATLAB",
  "Perl",
  "Lua",
  "Haskell",
  "Elixir",
  "Clojure",
  "Julia",
  "Zig",
] as const;

const popularByLower = new Map(POPULAR_GITHUB_LANGUAGES.map((lang) => [lang.toLowerCase(), lang]));

export function canonicalizePopularLanguage(trimmed: string): string | undefined {
  if (!trimmed) return undefined;
  return popularByLower.get(trimmed.toLowerCase());
}

export function repositoryLanguageControlValue(language: string): string {
  const trimmed = language.trim();
  if (!trimmed) return LANGUAGE_SELECT_NONE;
  const canonical = canonicalizePopularLanguage(trimmed);
  if (canonical) return canonical;
  return LANGUAGE_SELECT_CUSTOM;
}

export function splitLanguageForUi(lang: string): { preset: string; override: string } {
  const trimmed = lang.trim();
  if (!trimmed) {
    return { preset: LANGUAGE_SELECT_NONE, override: "" };
  }
  const canonical = canonicalizePopularLanguage(trimmed);
  if (canonical) {
    return { preset: canonical, override: "" };
  }
  return { preset: LANGUAGE_SELECT_CUSTOM, override: trimmed };
}
