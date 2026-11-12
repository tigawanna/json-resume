import { MorphingShape } from "@/components/loaders/shadcn-loaders";
import { cn } from "@/lib/utils";
import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";

export function RouterPendingComponent({
  showHeader = true,
  height = "h-dvh",
}: {
  showHeader?: boolean;
  height?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col items-center justify-center gap-4", height)}>
      {showHeader ? (
        <div className="flex w-full items-center justify-center gap-1 ">
          <Link
            to="/"
            className="flex w-fit items-center gap-2 text-lg font-medium hover:text-primary hover:underline"
          >
            <AppConfig.icon className="size-10" />
            {AppConfig.wordmark}
          </Link>
        </div>
      ) : null}
      <div className="flex  w-full flex-col items-center justify-center gap-4">
        <MorphingShape />
      </div>
    </div>
  );
}
