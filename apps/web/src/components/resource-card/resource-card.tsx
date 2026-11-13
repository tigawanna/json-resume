import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Composable resource card — the one card/list-row format every entity list
 * uses, so cards feel identical across routes. Structure, spacing, elevation
 * and the actions affordance are fixed; callers only fill slots:
 *
 *   <ResourceCard link={<Link … />} dataTest="row-x">
 *     <ResourceCardMedia>…optional preview…</ResourceCardMedia>
 *     <ResourceCardHeader title=… meta=… actions={<ResourceCardActions>…} />
 *     <ResourceCardBody>…</ResourceCardBody>
 *     <ResourceCardFooter>…</ResourceCardFooter>
 *   </ResourceCard>
 *
 * When `link` is set the overlay captures clicks anywhere on the card and the
 * content sits under it; interactive slots (`ResourceCardActions`, the header
 * `actions` slot) re-enable pointer events above the overlay themselves, so a
 * menu/actions zone never navigates the card.
 */

type ResourceCardProps = {
  children: ReactNode;
  /**
   * Fully-typed `<Link>` (or anchor) rendered as a full-surface overlay.
   * Web behaviour comes bundled: absolute fill, rounded corners, focus ring.
   */
  link?: ReactNode;
  className?: string;
  dataTest?: string;
  onClick?: () => void;
};

export function ResourceCard({ children, link, className, dataTest, onClick }: ResourceCardProps) {
  return (
    <div
      className={cn(
        "group border-border/70 bg-muted relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-border hover:shadow-md",
        onClick ? "cursor-pointer" : null,
        className,
      )}
      data-test={dataTest}
      onClick={onClick}
    >
      {link ? (
        <div className="absolute inset-0 z-10 [&>a]:focus-visible:outline-none [&>a]:absolute [&>a]:inset-0 [&>a]:rounded-xl [&>a]:focus-visible:ring-2 [&>a]:focus-visible:ring-ring">
          {link}
        </div>
      ) : null}
      <div
        className={cn("relative flex min-w-0 flex-1 flex-col", link ? "pointer-events-none" : null)}
      >
        {children}
      </div>
    </div>
  );
}

type ResourceCardMediaProps = {
  children: ReactNode;
  className?: string;
  dataTest?: string;
};

/** Full-width band above the content — doc-style preview, artwork, avatar. */
export function ResourceCardMedia({ children, className, dataTest }: ResourceCardMediaProps) {
  return (
    <div className={cn("bg-muted/40 border-b px-4 py-3", className)} data-test={dataTest}>
      {children}
    </div>
  );
}

type ResourceCardHeaderProps = {
  title: ReactNode;
  /** Small badges / metadata under the title. */
  meta?: ReactNode;
  /** Interactive zone (e.g. `ResourceCardActions`) pinned top-right. */
  actions?: ReactNode;
  className?: string;
};

export function ResourceCardHeader({ title, meta, actions, className }: ResourceCardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 pt-4", className)}>
      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 data-slot="card-title" className="truncate text-sm leading-tight font-medium">
          {title}
        </h3>
        {meta ? <ResourceCardMeta>{meta}</ResourceCardMeta> : null}
      </div>
      {actions ? (
        <div
          className="pointer-events-auto relative z-20 flex shrink-0 items-center gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

type ResourceCardMetaProps = {
  children: ReactNode;
  className?: string;
};

export function ResourceCardMeta({ children, className }: ResourceCardMetaProps) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs",
        className,
      )}
    >
      {children}
    </div>
  );
}

const CLAMP_CLASS: Record<number, string> = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
};

type ResourceCardBodyProps = {
  children: ReactNode;
  className?: string;
  /** Line clamp; pass a larger number or override with `className`. */
  clamp?: 1 | 2 | 3 | 4 | 5;
};

export function ResourceCardBody({ children, className, clamp = 3 }: ResourceCardBodyProps) {
  return <div className={cn("px-4 py-3", CLAMP_CLASS[clamp], className)}>{children}</div>;
}

type ResourceCardFooterProps = {
  children: ReactNode;
  className?: string;
};

/** Pinned to the card bottom — meta line, "View details", timestamps. */
export function ResourceCardFooter({ children, className }: ResourceCardFooterProps) {
  return (
    <div className={cn("border-t px-4 py-2.5 text-xs text-muted-foreground mt-auto", className)}>
      {children}
    </div>
  );
}
