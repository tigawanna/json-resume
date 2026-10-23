import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
  tone = "default",
  testId,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "destructive";
  testId?: string;
}) {
  const accent = tone === "destructive";

  return (
    <section
      id={id}
      data-test={testId}
      className="grid scroll-mt-20 items-start gap-4 @min-[36rem]:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] @min-[36rem]:gap-10"
    >
      <div>
        <Icon className={cn("size-6", accent ? "text-destructive" : "text-primary")} aria-hidden />
        <h2 className={cn("mt-3 text-base font-semibold", accent && "text-destructive")}>
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
        <span
          className={cn(
            "mt-4 block h-0.5 w-8 rounded-full",
            accent ? "bg-destructive" : "bg-primary",
          )}
          aria-hidden
        />
      </div>
      <div className="bg-muted/40 rounded-xl border px-5 py-5">{children}</div>
    </section>
  );
}
