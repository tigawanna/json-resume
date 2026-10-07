import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  backTo?: "/admin" | "/admin/tables";
  actions?: ReactNode;
};

export function AdminPageHeader({ title, description, backTo, actions }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3">
        {backTo ? (
          <Link to={backTo} className="btn btn-ghost btn-sm mt-0.5" data-test="admin-back">
            <ArrowLeft className="size-4" />
          </Link>
        ) : null}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <p className="text-sm text-base-content/70">{description}</p> : null}
        </div>
      </div>
      {actions}
    </header>
  );
}
