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
      className="relative scroll-mt-20 px-5 py-5 before:absolute before:inset-x-5 before:bottom-0 before:h-px before:bg-base-content/10 last:before:hidden"
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            accent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={cn("text-sm font-semibold", accent && "text-destructive")}>{title}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{description}</p>
        </div>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}
