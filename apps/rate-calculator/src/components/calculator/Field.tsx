import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  hint?: string;
}

function toDraft(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

export function NumberField({ id, label, value, onChange, prefix, suffix, step = 1, min = 0, hint }: NumberFieldProps) {
  // Keep the typed string separate from the numeric value so clearing the field
  // leaves it empty instead of writing 0 and appending the next keystroke to it.
  const [draft, setDraft] = useState(() => toDraft(value));
  const lastValue = useRef(value);

  if (value !== lastValue.current) {
    lastValue.current = value;
    setDraft(toDraft(value));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const next = event.target.value;
    setDraft(next);
    if (next.trim() === "") return;
    const parsed = Number(next);
    if (!Number.isFinite(parsed)) return;
    lastValue.current = parsed;
    onChange(parsed);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-normal text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={draft}
          onChange={handleChange}
          className={`numeric ${prefix ? "pl-9" : ""} ${suffix ? "pr-11" : ""}`}
        />
        {suffix ? (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  renderValue?: (value: T) => ReactNode;
}

export function SelectField<T extends string>({ id, label, value, onChange, options, renderValue }: SelectFieldProps<T>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-normal text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue>{renderValue ? renderValue(value) : undefined}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
