import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLocaleDate } from "@/utils/date-helpers";
import { cn } from "@/lib/utils";
import { ListOrdered, MapPin, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function formatLibraryDateRange(start?: string, end?: string) {
  return [start, end].filter((value) => Boolean(value?.trim())).join(" – ");
}

type LibraryEntityCardProps = {
  id: string;
  icon: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  dateRange?: ReactNode;
  location?: ReactNode;
  body?: ReactNode;
  identity?: ReactNode;
  sortOrder?: number;
  updatedAt?: number;
  actions?: ReactNode;
  onClick?: () => void;
};

export function LibraryEntityCard({
  id,
  icon: Icon,
  title,
  subtitle,
  dateRange,
  location,
  body,
  identity,
  sortOrder,
  updatedAt,
  actions,
  onClick,
}: LibraryEntityCardProps) {
  return (
    <li className="min-w-0">
      <Card
        className={cn(
          "hover:border-primary/40 h-full gap-4 py-5 transition-colors",
          onClick ? "cursor-pointer" : null,
        )}
        data-test={`row-${id}`}
        onClick={onClick}
      >
        <CardHeader className="grid-cols-[1fr_auto] items-start gap-3 pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <Icon className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-base leading-snug">{title}</CardTitle>
              {subtitle ? (
                <CardDescription className="line-clamp-2 text-sm">{subtitle}</CardDescription>
              ) : null}
              {dateRange ? <p className="text-muted-foreground text-xs">{dateRange}</p> : null}
              {location ? (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{location}</span>
                </p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div
              className="flex shrink-0 items-center gap-0.5"
              onClick={(event) => event.stopPropagation()}
            >
              {actions}
            </div>
          ) : null}
        </CardHeader>

        {body ? (
          <CardContent className="text-muted-foreground line-clamp-3 pt-0 text-sm">
            {body}
          </CardContent>
        ) : null}

        <CardFooter className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t pt-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {identity ? <p className="text-foreground/80 truncate text-sm">{identity}</p> : null}
            {typeof sortOrder === "number" ? (
              <Badge variant="secondary" className="w-fit text-xs" title="Library sort order">
                <ListOrdered className="mr-1 size-3" />#{sortOrder}
              </Badge>
            ) : null}
          </div>
          {updatedAt != null ? (
            <p className="text-muted-foreground shrink-0 text-xs">
              Updated {formatLocaleDate(updatedAt)}
            </p>
          ) : null}
        </CardFooter>
      </Card>
    </li>
  );
}

export function LibraryEntityCardGrid({
  children,
  dataTest,
}: {
  children: ReactNode;
  dataTest?: string;
}) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2" data-test={dataTest}>
      {children}
    </ul>
  );
}
