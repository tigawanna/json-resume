import {
  ResourceCard,
  ResourceCardActions,
  ResourceCardBody,
  ResourceCardFooter,
  ResourceCardHeader,
  ResourceCardMeta,
} from "@/components/resource-card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { formatLocaleDate } from "@/utils/date-helpers";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  GitFork,
  ListOrdered,
  MapPin,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";
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
  /** Custom action slot (e.g. non-standard button clusters). */
  actions?: ReactNode;
  /** Standard row actions rendered through the shared kebab menu. */
  onEdit?: () => void;
  onDelete?: () => void;
  onClone?: () => void;
  onNavigateToDetails?: () => void;
  onClick?: () => void;
  className?: string;
};

/**
 * The library entity card, built on the shared `ResourceCard` parts so every
 * list shares one look: elevation, meta row, kebab actions, pinned footer.
 */
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
  onEdit,
  onDelete,
  onClone,
  onNavigateToDetails,
  actions,
  onClick,
  className,
}: LibraryEntityCardProps) {
  const meta = (
    <>
      {subtitle ? <span className="truncate">{subtitle}</span> : null}
      {dateRange ? <span className="truncate">{dateRange}</span> : null}
      {location ? (
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{location}</span>
        </span>
      ) : null}
    </>
  );
  const menuItems = [onNavigateToDetails, onClone, onEdit].filter(Boolean).length;
  const hasActions = Boolean(onEdit ?? onDelete ?? onClone ?? onNavigateToDetails);

  return (
    <li className="min-w-0">
      <ResourceCard
        dataTest={`row-${id}`}
        className={cn("h-full", onClick ? "cursor-pointer" : null)}
        onClick={onClick}
      >
        <ResourceCardHeader
          title={
            <span className="flex min-w-0 items-center gap-2">
              <Icon className="text-primary size-4 shrink-0" />
              <span className="truncate">{title}</span>
            </span>
          }
          meta={(subtitle ?? dateRange ?? location) ? meta : null}
          actions={
            actions ? (
              actions
            ) : hasActions ? (
              <ResourceCardActions label="Card actions">
                {onNavigateToDetails ? (
                  <DropdownMenuItem onSelect={onNavigateToDetails} data-test="row-details-btn">
                    <ChevronRight className="text-muted-foreground" /> Details
                  </DropdownMenuItem>
                ) : null}
                {onClone ? (
                  <DropdownMenuItem onSelect={onClone} data-test="row-clone-btn">
                    <GitFork className="text-muted-foreground" /> Clone
                  </DropdownMenuItem>
                ) : null}
                {onEdit ? (
                  <DropdownMenuItem onSelect={onEdit} data-test="row-edit-btn">
                    <Pencil className="text-muted-foreground" /> Edit
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <>
                    {menuItems > 0 ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={onDelete}
                      data-test="row-delete-btn"
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </ResourceCardActions>
            ) : null
          }
        />

        {body ? (
          <ResourceCardBody className="text-muted-foreground text-sm" clamp={3}>
            {body}
          </ResourceCardBody>
        ) : null}

        <ResourceCardFooter className="flex flex-wrap items-end justify-between gap-2">
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
        </ResourceCardFooter>
      </ResourceCard>
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
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-10" data-test={dataTest}>
      {children}
    </ul>
  );
}
