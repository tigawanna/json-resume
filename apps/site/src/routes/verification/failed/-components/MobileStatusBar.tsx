import { Battery, Signal, Wifi } from "lucide-react";
import { twMerge } from "tailwind-merge";

const navy = "text-[#0B1F3B]";

export function MobileStatusBar({ className }: { className?: string }) {
  return (
    <div
      className={twMerge(
        "relative flex h-11 w-full shrink-0 items-center justify-between px-5",
        className,
      )}
      data-test="mobile-status-bar"
    >
      <time
        dateTime="09:41"
        className={twMerge("text-[15px] font-semibold leading-none tracking-tight", navy)}
      >
        9:41
      </time>
      <span className="bg-[#0B1F3B] absolute top-2 right-19 size-1.5 rounded-full" aria-hidden />
      <div className={twMerge("flex items-center gap-1", navy)} aria-hidden>
        <Signal className="size-4" strokeWidth={2.25} />
        <Wifi className="size-4" strokeWidth={2.25} />
        <Battery className="size-6" strokeWidth={2} />
      </div>
    </div>
  );
}
