import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ResumeDTO } from "@/data-access-layer/resume/resume.types";
import { formatDistanceToNow } from "date-fns";
import { FileText, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

interface BaseResumeSelectorProps {
  resumes: ResumeDTO[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const BLANK_VALUE = "__blank__";

export function BaseResumeSelector({ resumes, selectedId, onSelect }: BaseResumeSelectorProps) {
  const [query, setQuery] = useState("");
  const value = selectedId ?? BLANK_VALUE;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? resumes
      : resumes.filter((r) => {
          const name = r.name.toLowerCase();
          const author = r.data.header.fullName.toLowerCase();
          return name.includes(q) || author.includes(q);
        });
    if (selectedId) {
      const selected = resumes.find((r) => r.id === selectedId);
      if (selected && !list.some((r) => r.id === selectedId)) {
        return [selected, ...list];
      }
    }
    return list;
  }, [resumes, query, selectedId]);

  function handleChange(val: string) {
    onSelect(val === BLANK_VALUE ? null : val);
  }

  return (
    <div className="flex flex-col gap-3" data-test="base-resume-selector">
      <Label className="text-sm font-medium">Start from</Label>
      {resumes.length > 0 && (
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search saved resumes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            data-test="base-resume-search"
          />
        </div>
      )}
      <RadioGroup value={value} onValueChange={handleChange} className="grid gap-2 sm:grid-cols-2">
        <Label
          htmlFor="base-blank"
          className="border-base-300 hover:border-base-content/30 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors"
        >
          <RadioGroupItem value={BLANK_VALUE} id="base-blank" className="mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" />
              <span className="text-sm font-medium">Blank template</span>
            </div>
            <span className="text-base-content/60 text-xs">
              Start with the default Alex Rivera sample
            </span>
          </div>
        </Label>

        {filtered.map((r) => {
          return (
            <Label
              key={r.id}
              htmlFor={`base-${r.id}`}
              className="border-base-300 hover:border-base-content/30 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors"
            >
              <RadioGroupItem value={r.id} id={`base-${r.id}`} className="mt-0.5" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 shrink-0" />
                  <span className="truncate text-sm font-medium">{r.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {r.data.header.fullName}
                  </Badge>
                  <span className="text-base-content/50 text-[10px]">
                    {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
