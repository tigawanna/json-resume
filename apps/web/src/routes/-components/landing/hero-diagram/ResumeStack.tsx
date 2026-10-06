import { UserRound } from "lucide-react";

export function ResumeStack() {
  return (
    <div className="relative h-52 w-36">
      <div className="absolute inset-0 translate-x-3 translate-y-3 border border-border bg-base-300" />
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 border border-border bg-base-200" />
      <div className="relative flex h-full flex-col border border-border bg-base-100 shadow-[0_0_32px_-6px_var(--color-primary)]">
        <div className="absolute inset-y-0 left-0 w-2 bg-base-content" />
        <div className="absolute inset-y-0 right-0 w-1 bg-primary" />
        <UserRound aria-hidden className="mt-5 ml-6 size-5 text-base-content" strokeWidth={1.75} />
        <div className="mt-4 ml-6 flex flex-col gap-2 pr-4">
          <span className="h-1.5 w-16 bg-base-content/70" />
          <span className="h-1 w-full bg-base-content/15" />
          <span className="h-1 w-11/12 bg-primary/80" />
          <span className="h-1 w-full bg-base-content/15" />
          <span className="h-1 w-3/4 bg-base-content/15" />
          <span className="mt-2 h-1 w-10 bg-base-content/50" />
          <span className="h-1 w-full bg-base-content/15" />
          <span className="h-1 w-5/6 bg-primary/70" />
          <span className="h-1 w-2/3 bg-base-content/15" />
        </div>
      </div>
    </div>
  );
}
