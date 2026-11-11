import { useEffect, useRef, useState } from "react";

import {
  applyWorkbenchStep,
  buildWorkbenchSteps,
  completedWorkbenchState,
  initialWorkbenchState,
  type WorkbenchStep,
  type WorkbenchStreamState,
  type WorkbenchView,
} from "../-utils/workbench-script";

/** Pause between loops, so a returning visitor can catch the start. */
const LOOP_HOLD_MS = 4_400;

function delayFor(step: WorkbenchStep) {
  switch (step.kind) {
    case "type":
      return 45;
    case "send":
      return 220;
    case "thinking":
      return 24;
    case "text":
      return 32;
    case "toolArgs":
      return 14;
    case "toolStart":
      return 140;
    case "toolResult":
      return 320;
    case "phase":
      return 200;
  }
}

/**
 * Drives the landing workbench preview.
 *
 * - Runs only while the frame is on screen (`active`), so it costs nothing on
 *   the rest of the page.
 * - Loops: type → send → stream → hold → reset.
 * - Under `prefers-reduced-motion` it renders the finished pass once and never
 *   starts a timer.
 */
export function useWorkbenchStream({ active }: { active: boolean }) {
  const [state, setState] = useState<WorkbenchStreamState>(initialWorkbenchState);
  const [nonce, setNonce] = useState(0);
  const stepsRef = useRef<WorkbenchStep[]>([]);
  const indexRef = useRef(0);
  const runRef = useRef(0);

  useEffect(() => {
    if (stepsRef.current.length === 0) stepsRef.current = buildWorkbenchSteps();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState({ ...completedWorkbenchState(), run: runRef.current });
      return;
    }

    if (!active) return;

    let cancelled = false;
    let holding = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function schedule(delay: number) {
      timer = setTimeout(tick, delay);
    }

    function tick() {
      if (cancelled) return;

      // The finished pass stays on screen for `LOOP_HOLD_MS`, then the next
      // run starts from an empty thread and an empty composer.
      if (holding) {
        holding = false;
        runRef.current += 1;
        indexRef.current = 0;
        setState({ ...initialWorkbenchState(), run: runRef.current });
        schedule(400);
        return;
      }

      const step = stepsRef.current[indexRef.current];
      if (!step) {
        holding = true;
        schedule(LOOP_HOLD_MS);
        return;
      }

      indexRef.current += 1;
      setState((previous) => applyWorkbenchStep(previous, step));
      schedule(delayFor(step));
    }

    indexRef.current = 0;
    setState({ ...initialWorkbenchState(), run: runRef.current });
    schedule(700);

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [active, nonce]);

  return {
    state,
    /** Manual tab pick; the script stops switching views until the next run. */
    setView: (view: WorkbenchView) =>
      setState((previous) => ({ ...previous, view, viewPinned: true })),
    restart: () => setNonce((value) => value + 1),
  };
}
