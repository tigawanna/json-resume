import { isExtensionSource, readFrameScripts } from "@/utils/long-animation-frames";
import { useEffect, useEffectEvent, useState } from "react";

export interface FrameStats {
  fps: number;
  /** Time spent in long tasks (>50ms) during this sample. */
  longTaskMs: number;
  /** Script time inside long frames that came from browser extensions. */
  extensionMs: number;
  domNodes: number;
  /** Script time inside long frames during this sample, keyed by source. */
  scriptMs: Map<string, number>;
  /** Length of the sample window; slightly over 1000 when frames are late. */
  windowMs: number;
}

/**
 * Counts animation frames and reports one sample a second. Frames stop in a
 * background tab, so samples pause until the tab is visible again.
 */
export function useFrameStats(options: {
  enabled?: boolean;
  onSample?: (stats: FrameStats) => void;
}) {
  const { enabled = true, onSample } = options;
  const [latest, setLatest] = useState<FrameStats | null>(null);
  const emitSample = useEffectEvent((stats: FrameStats) => {
    setLatest(stats);
    onSample?.(stats);
  });

  useEffect(() => {
    if (!enabled) return;
    let longTaskMs = 0;
    let extensionMs = 0;
    let scriptMs = new Map<string, number>();

    const supported = PerformanceObserver.supportedEntryTypes;
    const longTaskObserver = supported.includes("longtask")
      ? new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) longTaskMs += entry.duration;
        })
      : null;
    longTaskObserver?.observe({ type: "longtask" });

    const frameObserver = supported.includes("long-animation-frame")
      ? new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            for (const script of readFrameScripts(entry)) {
              scriptMs.set(script.source, (scriptMs.get(script.source) ?? 0) + script.durationMs);
              if (isExtensionSource(script.source)) extensionMs += script.durationMs;
            }
          }
        })
      : null;
    frameObserver?.observe({ type: "long-animation-frame" });

    let windowStart = performance.now();
    let frames = 0;
    let frameId = 0;

    function tick(now: number) {
      frames += 1;
      const windowMs = now - windowStart;
      if (windowMs >= 1000) {
        emitSample({
          fps: Math.round((frames * 1000) / windowMs),
          longTaskMs: Math.round(longTaskMs),
          extensionMs: Math.round(extensionMs),
          domNodes: document.getElementsByTagName("*").length,
          scriptMs,
          windowMs,
        });
        windowStart = now;
        frames = 0;
        longTaskMs = 0;
        extensionMs = 0;
        scriptMs = new Map();
      }
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      longTaskObserver?.disconnect();
      frameObserver?.disconnect();
    };
  }, [enabled]);

  return enabled ? latest : null;
}
