import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type LibraryQuickLink = {
  title: string;
  href: string;
  icon: LucideIcon;
  countKey: string;
  count: number;
};

interface LibraryQuickLinksProps {
  items: readonly LibraryQuickLink[];
}

export function LibraryQuickLinks({ items }: LibraryQuickLinksProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-test="library-quick-links">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.href} className="min-w-0">
            <Link
              to={item.href}
              className={cn(
                "border-border bg-base-200/60 hover:border-primary/45 hover:bg-base-200",
                "focus-visible:ring-primary/50 group flex h-full items-center gap-3 rounded-xl border px-3.5 py-3.5",
                "transition-[border-color,background-color,transform] duration-150 ease-out",
                "hover:-translate-y-px focus-visible:ring-2 focus-visible:outline-none",
              )}
              data-test={`library-link-${item.countKey}`}
            >
              <span className="bg-primary/12 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm font-medium">
                  {item.title}
                </span>
                <span className="text-muted-foreground text-xs">Open collection</span>
              </span>
              <span className="text-foreground shrink-0 text-xl font-semibold tabular-nums tracking-tight">
                {item.count}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
