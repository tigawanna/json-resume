import { TEMPLATE_IDS, TEMPLATE_LABELS, type TemplateId } from "@/features/resume/resume-schema";
import { twMerge } from "tailwind-merge";

const TEMPLATE_DESCRIPTIONS: Record<TemplateId, string> = {
  classic: "Single column, centered headings",
  sidebar: "Two columns — main left, sidebar right",
  accent: "Single column with warm accent",
  modern: "Two columns with cool accent",
};

interface TemplatePickerProps {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
}

export function TemplatePicker({ selected, onSelect }: TemplatePickerProps) {
  return (
    <div className="flex flex-col gap-2" data-test="template-picker">
      <h2 className="text-sm font-medium">Template</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TEMPLATE_IDS.map((tid) => (
          <button
            key={tid}
            type="button"
            onClick={() => onSelect(tid)}
            className={twMerge(
              "flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-colors",
              tid === selected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30",
            )}
            data-test={`template-${tid}`}
          >
            <span className="text-sm font-semibold">{TEMPLATE_LABELS[tid]}</span>
            <span className="text-muted-foreground text-xs">{TEMPLATE_DESCRIPTIONS[tid]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
