import { SiteIcon } from "@/components/icon/SiteIcon";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";

export function RouterPendingComponent() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-2 relative overflow-hidden">
      <BackgroundRippleEffect
        rows={10}
        cols={10}
        cellSize={56}
        className="mt-20"
        pulse
        pulseTarget="random"
        pulseInterval={3000}
      />
      <SiteIcon size={250} />
      {/* <div className="bg-primary/5 flex h-[80vh] w-[95%] items-center justify-center rounded-2xl">
      </div> */}
    </div>
  );
}
