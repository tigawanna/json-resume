import { fpsToneClass } from "@/components/fps-counter/FpsCounter";
import { cn } from "@/lib/utils";
import type { FpsSample } from "../-hooks/use-fps-monitor";

interface FpsMeterProps {
  sample: FpsSample | null;
  running: boolean;
  totalTokens: number;
  messageCount: number;
  sessionChars: number;
}

export function FpsMeter({
  sample,
  running,
  totalTokens,
  messageCount,
  sessionChars,
}: FpsMeterProps) {
  const fps = sample?.fps ?? null;
  return (
    <div
      className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground"
      data-test="chat-stress-fps"
    >
      <span className={cn("rounded-md px-2 py-1 text-sm font-semibold", fpsToneClass(fps))}>
        {fps === null ? "--" : fps} fps
      </span>
      <span>
        {(sample?.tokens ?? 0).toLocaleString()}/{totalTokens.toLocaleString()} tokens
      </span>
      <span>{sample?.deliveredTps ?? 0}/s</span>
      <span>behind {sample?.behindTokens ?? 0}</span>
      <span>{messageCount} msgs</span>
      <span>{sessionChars.toLocaleString()} chars</span>
      <span>{running ? "running" : "idle"}</span>
    </div>
  );
}
