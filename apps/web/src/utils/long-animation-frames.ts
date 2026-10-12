const EXTENSION_PREFIX = "chrome-extension://";
const EXTENSION_LABEL = "extension ";

export interface ScriptAttribution {
  source: string;
  durationMs: number;
}

export function isLongAnimationFrameSupported() {
  return (
    typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes.includes("long-animation-frame")
  );
}

export function isExtensionSource(source: string) {
  return source.startsWith(EXTENSION_LABEL);
}

function describeScriptSource(sourceURL: string, invoker: string) {
  if (sourceURL.startsWith(EXTENSION_PREFIX)) {
    const extensionId = sourceURL.slice(EXTENSION_PREFIX.length).split("/")[0];
    return `${EXTENSION_LABEL}${extensionId}`;
  }
  if (!sourceURL) return invoker ? `(no url) ${invoker}` : "(no url)";
  try {
    const url = new URL(sourceURL);
    return url.origin === location.origin ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return sourceURL;
  }
}

/**
 * Reads the `scripts` of a Long Animation Frame entry (Chromium only, not in
 * lib.dom yet). Returns an empty list for anything that isn't one.
 */
export function readFrameScripts(entry: PerformanceEntry): ScriptAttribution[] {
  if (!("scripts" in entry) || !Array.isArray(entry.scripts)) return [];
  const scripts: ScriptAttribution[] = [];
  for (const script of entry.scripts) {
    if (typeof script !== "object" || script === null) continue;
    const sourceURL = "sourceURL" in script ? script.sourceURL : "";
    const invoker = "invoker" in script ? script.invoker : "";
    const duration = "duration" in script ? script.duration : 0;
    if (typeof duration !== "number") continue;
    scripts.push({
      source: describeScriptSource(
        typeof sourceURL === "string" ? sourceURL : "",
        typeof invoker === "string" ? invoker : "",
      ),
      durationMs: duration,
    });
  }
  return scripts;
}

export function addScriptTimes(target: Map<string, number>, source: Map<string, number>) {
  for (const [key, ms] of source) target.set(key, (target.get(key) ?? 0) + ms);
}

/** Logs the heaviest script sources as a table; extension ids map to names at chrome://extensions. */
export function logScriptSources(prefix: string, scriptMs: Map<string, number>) {
  const total = [...scriptMs.values()].reduce((sum, ms) => sum + ms, 0);
  if (total === 0) return;
  const rows = [...scriptMs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([source, ms]) => ({
      source,
      ms: Math.round(ms),
      share: `${Math.round((ms / total) * 100)}%`,
    }));
  console.log(
    `${prefix} script time inside long frames by source (match extension ids at chrome://extensions with Developer mode on)`,
  );
  console.table(rows);
}
