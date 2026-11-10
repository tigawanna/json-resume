import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EllipsisVertical } from "lucide-react";
import type { ReactNode } from "react";

type ResourceCardActionsProps = {
  /** `DropdownMenuItem` elements (the actions for this resource). */
  children: ReactNode;
  label?: string;
  align?: "start" | "center" | "end";
  dataTest?: string;
  className?: string;
};

/**
 * Kebab trigger + dropdown — the single actions affordance on resource cards
 * and list rows. Already lifted above a `ResourceCard` link overlay and stops
 * click propagation, so opening the menu never navigates the card.
 */
export function ResourceCardActions({
  children,
  label = "More actions",
  align = "end",
  dataTest = "row-actions-btn",
  className,
}: ResourceCardActionsProps) {
  return (
    <div
      className={cn("pointer-events-auto relative z-20 inline-flex", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-8"
            aria-label={label}
            data-test={dataTest}
          >
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="min-w-40">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
