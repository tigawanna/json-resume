import { Button } from "@/components/ui/button";
import { useFrameStats, type FrameStats } from "@/hooks/use-frame-stats";
import { cn } from "@/lib/utils";
import {
  addScriptTimes,
  isLongAnimationFrameSupported,
  logScriptSources,
} from "@/utils/long-animation-frames";
import { Circle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const LOG_PREFIX = "[fps]";
const SLOW_FPS = 30;

interface RecordedSample {
  second: number;
  fps: number;
  longTaskMs: number;
  extensionMs: number;
  domNodes: number;
}

interface Recording {
  label: string;
  startedAt: number;
  samples: RecordedSample[];
  scriptMs: Map<string, number>;
}

export function fpsToneClass(fps: number | null) {
  if (fps === null) return "bg-base-200";
  if (fps >= 50) return "bg-success/15 text-success";
  if (fps >= SLOW_FPS) return "bg-warning/15 text-warning";
  return "bg-error/15 text-error";
}

function logRecording(recording: Recording) {
  const { samples } = recording;
  console.log(`${LOG_PREFIX} ${recording.label} recording stopped`);
  if (samples.length === 0) return;
  console.table(samples);
  console.log(`${LOG_PREFIX} ${recording.label} summary`, {
    seconds: samples.length,
    avgFps: Math.round(samples.reduce((sum, s) => sum + s.fps, 0) / samples.length),
    minFps: Math.min(...samples.map((s) => s.fps)),
    slowSeconds: samples.filter((s) => s.fps < SLOW_FPS).length,
    totalLongTaskMs: samples.reduce((sum, s) => sum + s.longTaskMs, 0),
    totalExtensionMs: samples.reduce((sum, s) => sum + s.extensionMs, 0),
    maxDomNodes: Math.max(...samples.map((s) => s.domNodes)),
  });
  logScriptSources(`${LOG_PREFIX} ${recording.label}`, recording.scriptMs);
}

interface FpsCounterProps {
  /** Names the recording in console logs. */
  label: string;
  className?: string;
}

/** Dev-only frame-rate badge; click to record per-second samples to the console. */
export function FpsCounter(props: FpsCounterProps) {
  if (!import.meta.env.DEV) return null;
  return <FpsCounterBadge {...props} />;
}

function FpsCounterBadge({ label, className }: FpsCounterProps) {
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef<Recording | null>(null);

  function handleSample(stats: FrameStats) {
    const current = recordingRef.current;
    if (!current) return;
    const sample: RecordedSample = {
      second: Math.round((performance.now() - current.startedAt) / 1000),
      fps: stats.fps,
      longTaskMs: stats.longTaskMs,
      extensionMs: stats.extensionMs,
      domNodes: stats.domNodes,
    };
    current.samples.push(sample);
    addScriptTimes(current.scriptMs, stats.scriptMs);
    console.log(
      `${LOG_PREFIX} ${label} t=${sample.second}s fps=${sample.fps} longTasks=${sample.longTaskMs}ms extensions=${sample.extensionMs}ms dom=${sample.domNodes}`,
    );
  }

  const stats = useFrameStats({ onSample: handleSample });

  useEffect(
    () => () => {
      if (recordingRef.current) logRecording(recordingRef.current);
      recordingRef.current = null;
    },
    [],
  );

  function toggleRecording() {
    if (recordingRef.current) {
      logRecording(recordingRef.current);
      recordingRef.current = null;
      setRecording(false);
      return;
    }
    recordingRef.current = {
      label,
      startedAt: performance.now(),
      samples: [],
      scriptMs: new Map(),
    };
    console.log(`${LOG_PREFIX} ${label} recording started`);
    setRecording(true);
  }

  const fps = stats?.fps ?? null;
  const extensionMs = stats?.extensionMs ?? 0;
  const title = [
    recording
      ? "Stop recording and log the summary"
      : "Record per-second frame stats to the console",
    isLongAnimationFrameSupported()
      ? "Extension time comes from long-animation-frame script attribution."
      : "This browser can't attribute script time to extensions.",
  ].join("\n");

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleRecording}
      title={title}
      aria-pressed={recording}
      className={cn("h-7 gap-1.5 px-2 font-mono text-xs", fpsToneClass(fps), className)}
      data-test="fps-counter"
    >
      {recording ? (
        <Circle className="size-2.5 animate-pulse fill-current" aria-label="Recording" />
      ) : null}
      <span>{fps === null ? "--" : fps} fps</span>
      {extensionMs > 0 ? <span className="opacity-80">ext {extensionMs}ms</span> : null}
    </Button>
  );
}
