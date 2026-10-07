import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface AdminActionCardProps {
  title: string;
  description: ReactNode;
  danger?: boolean;
  children: ReactNode;
  "data-test"?: string;
}

export function AdminActionCard({
  title,
  description,
  danger = false,
  children,
  "data-test": dataTest,
}: AdminActionCardProps) {
  return (
    <section
      className={twMerge(
        "flex flex-col gap-3 rounded-lg border border-base-300 p-4",
        danger && "border-error/30",
      )}
      data-test={dataTest}
    >
      <div className="flex flex-col gap-1">
        <h3 className={twMerge("font-medium", danger && "text-error")}>{title}</h3>
        <div className="text-sm text-base-content/70">{description}</div>
      </div>
      {children}
    </section>
  );
}
