/** Matches the inline boot markup in index.html so the pre-React and React loaders look identical. */
export function BootScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <p className="text-lg font-medium tracking-tight">
        calc paye kenya<span className="text-primary">.</span>
      </p>
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary motion-reduce:[animation-duration:1.6s]"
      />
      <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Loading rates</p>
    </div>
  );
}
