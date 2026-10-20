import { Button } from "@/components/ui/button";
import { useFrameStats, type FrameStats } from "@/hooks/use-frame-stats";
import { cn } from "@/lib/utils";
import {
  addScriptTimes,
  isLongAnimationFrameSupported,
  logScriptSources,
} from "@/utils/long-animation-frames";
import { Circle } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

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
  label?: string;
  className?: string;
}

const POSITION_KEY = "fps-counter-position";
const DRAG_THRESHOLD_PX = 4;

interface BadgePosition {
  x: number;
  y: number;
}

function readPosition(): BadgePosition {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return defaultPosition();
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "x" in parsed &&
      "y" in parsed &&
      typeof parsed.x === "number" &&
      typeof parsed.y === "number"
    ) {
      return clampPosition(parsed.x, parsed.y);
    }
  } catch {
    // A bad stored value falls back to the default corner.
  }
  return defaultPosition();
}

function defaultPosition(): BadgePosition {
  if (typeof window === "undefined") return { x: 16, y: 16 };
  return { x: Math.max(16, window.innerWidth - 140), y: Math.max(16, window.innerHeight - 72) };
}

function clampPosition(x: number, y: number): BadgePosition {
  if (typeof window === "undefined") return { x, y };
  return {
    x: Math.min(window.innerWidth - 48, Math.max(8, x)),
    y: Math.min(window.innerHeight - 36, Math.max(8, y)),
  };
}

/** Dev-only frame-rate badge; click to record per-second samples to the console. */
export function FpsCounter(props: FpsCounterProps) {
  if (!import.meta.env.DEV) return null;
  return <FpsCounterBadge {...props} />;
}

function FpsCounterBadge({ label = "app", className }: FpsCounterProps) {
  const [recording, setRecording] = useState(false);
  const [position, setPosition] = useState(readPosition);
  const positionRef = useRef(position);
  positionRef.current = position;
  const recordingRef = useRef<Recording | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

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

  useEffect(() => {
    function onResize() {
      setPosition((current) => clampPosition(current.x, current.y));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
    if (
      Math.abs(next.x - positionRef.current.x) > DRAG_THRESHOLD_PX ||
      Math.abs(next.y - positionRef.current.y) > DRAG_THRESHOLD_PX
    ) {
      drag.moved = true;
    }
    if (drag.moved) {
      positionRef.current = next;
      setPosition(next);
    }
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.moved) {
      localStorage.setItem(POSITION_KEY, JSON.stringify(positionRef.current));
      return;
    }
    toggleRecording();
  }

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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title={title}
      aria-pressed={recording}
      style={{ left: position.x, top: position.y }}
      className={cn(
        "fixed z-50 h-7 cursor-grab touch-none gap-1.5 px-2 font-mono text-xs shadow-md active:cursor-grabbing",
        fpsToneClass(fps),
        className,
      )}
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
