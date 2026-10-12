import { useFrameStats, type FrameStats } from "@/hooks/use-frame-stats";
import { addScriptTimes, logScriptSources } from "@/utils/long-animation-frames";
import { useEffect, useRef, useState } from "react";
import type { StressProgress } from "../-utils/fake-chat-stream";

export interface FpsSample {
  second: number;
  fps: number;
  tokens: number;
  /** Tokens that reached the chat during this sample. */
  deliveredTps: number;
  /** How far the stream lags its schedule; grows once the page can't keep up. */
  behindTokens: number;
  longTaskMs: number;
  /** Script time inside long frames that came from `chrome-extension://` URLs. */
  extensionMs: number;
  domNodes: number;
}

interface MonitorRun {
  startedAt: number;
  tokensAtLastSample: number;
  samples: FpsSample[];
  scriptMs: Map<string, number>;
}

const LOG_PREFIX = "[chat-stress]";
const DEGRADED_FPS = 30;
/** Consecutive slow samples before the run counts as degraded, so one hiccup doesn't. */
const DEGRADED_SAMPLES = 3;

function logSummary(samples: FpsSample[], totalTokens: number) {
  const last = samples.at(-1);
  if (!last) return;
  const degradedIndex = samples.findIndex((_, index) => {
    const window = samples.slice(index, index + DEGRADED_SAMPLES);
    return window.length === DEGRADED_SAMPLES && window.every((s) => s.fps < DEGRADED_FPS);
  });
  const degraded = samples[degradedIndex];
  console.table(samples);
  console.log(`${LOG_PREFIX} summary`, {
    seconds: last.second,
    tokens: `${last.tokens}/${totalTokens}`,
    avgFps: Math.round(samples.reduce((sum, s) => sum + s.fps, 0) / samples.length),
    minFps: Math.min(...samples.map((s) => s.fps)),
    totalLongTaskMs: samples.reduce((sum, s) => sum + s.longTaskMs, 0),
    totalExtensionMs: samples.reduce((sum, s) => sum + s.extensionMs, 0),
    maxBehindTokens: Math.max(...samples.map((s) => s.behindTokens)),
    degradedAt: degraded
      ? { second: degraded.second, tokens: degraded.tokens, domNodes: degraded.domNodes }
      : `never below ${DEGRADED_FPS} fps for ${DEGRADED_SAMPLES}s`,
  });
}

/**
 * Logs one sample a second while `running`, then a table and summary when it
 * stops. Frames stop in a background tab, so keep the tab visible during a run.
 */
export function useFpsMonitor(options: {
  running: boolean;
  progress: StressProgress;
  tokensPerSecond: number;
  totalTokens: number;
}) {
  const { running, progress, tokensPerSecond, totalTokens } = options;
  const [latest, setLatest] = useState<FpsSample | null>(null);
  const runRef = useRef<MonitorRun | null>(null);

  useEffect(() => {
    if (!running) return;
    const run: MonitorRun = {
      startedAt: performance.now(),
      tokensAtLastSample: progress.emittedTokens,
      samples: [],
      scriptMs: new Map(),
    };
    runRef.current = run;
    return () => {
      runRef.current = null;
      logSummary(run.samples, totalTokens);
      logScriptSources(LOG_PREFIX, run.scriptMs);
    };
  }, [running, progress, totalTokens]);

  function handleSample(stats: FrameStats) {
    const run = runRef.current;
    if (!run) return;
    const now = performance.now();
    const tokens = progress.emittedTokens;
    const streamElapsed = progress.startedAt === null ? 0 : now - progress.startedAt;
    const scheduled = Math.min(totalTokens, (streamElapsed / 1000) * tokensPerSecond);
    const sample: FpsSample = {
      second: Math.round((now - run.startedAt) / 1000),
      fps: stats.fps,
      tokens,
      deliveredTps: Math.round(((tokens - run.tokensAtLastSample) * 1000) / stats.windowMs),
      behindTokens: Math.max(0, Math.round(scheduled - tokens)),
      longTaskMs: stats.longTaskMs,
      extensionMs: stats.extensionMs,
      domNodes: stats.domNodes,
    };
    run.tokensAtLastSample = tokens;
    run.samples.push(sample);
    addScriptTimes(run.scriptMs, stats.scriptMs);
    setLatest(sample);
    console.log(
      `${LOG_PREFIX} t=${sample.second}s fps=${sample.fps} tokens=${tokens}/${totalTokens} delivered=${sample.deliveredTps}/s behind=${sample.behindTokens} longTasks=${sample.longTaskMs}ms extensions=${sample.extensionMs}ms dom=${sample.domNodes}`,
    );
  }

  useFrameStats({ enabled: running, onSample: handleSample });

  return latest;
}
