import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useLiveSuspenseQuery } from "@tanstack/react-db";

interface ResumePickerFieldProps {
  value: string;
  onChange: (resumeId: string) => void;
  label?: string;
  error?: string;
}

export function ResumePickerField({
  value,
  onChange,
  label = "Resume",
  error,
}: ResumePickerFieldProps) {
  const db = useEventSourcedDb();
  const { data: resumes } = useLiveSuspenseQuery(
    (q) => q.from({ resume: db.collections.resume }),
    [],
  );

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 w-full" data-test="resume-picker">
          <SelectValue placeholder="Select a resume…" />
        </SelectTrigger>
        <SelectContent>
          {resumes.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </div>
  );
}
