import { createEffect, createSignal, For, untrack } from "solid-js";

type Accessor<T> = () => T;

function toDraft(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: Accessor<number>;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  hint?: string;
}

export function NumberField(props: NumberFieldProps) {
  const [draft, setDraft] = createSignal(toDraft(untrack(props.value)));
  let lastValue = untrack(props.value);

  // The draft follows typed text; this effect only reacts to values changed
  // elsewhere (the other salary field, a scenario button, a rate update).
  createEffect(
    props.value,
    (value) => {
      if (value !== lastValue) {
        lastValue = value;
        setDraft(toDraft(value));
      }
    },
  );

  function handleInput(event: InputEvent & { currentTarget: HTMLInputElement }): void {
    const next = event.currentTarget.value;
    setDraft(next);
    if (next.trim() === "") return;
    const parsed = Number(next);
    if (!Number.isFinite(parsed)) return;
    lastValue = parsed;
    props.onChange(parsed);
  }

  return (
    <div class="space-y-1.5">
      <label for={props.id} class="text-[11px] font-normal text-muted-foreground">
        {props.label}
      </label>
      <div class="relative">
        {props.prefix ? (
          <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground">
            {props.prefix}
          </span>
        ) : null}
        <input
          id={props.id}
          type="number"
          inputmode="decimal"
          min={props.min ?? 0}
          step={props.step ?? 1}
          value={draft()}
          onInput={handleInput}
          class={`numeric h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${props.prefix ? "pl-9" : ""} ${props.suffix ? "pr-11" : ""}`}
        />
        {props.suffix ? (
          <span class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted-foreground">
            {props.suffix}
          </span>
        ) : null}
      </div>
      {props.hint ? <p class="text-[10px] text-muted-foreground">{props.hint}</p> : null}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; short?: string }[];
}

export function SelectField<T extends string>(props: SelectFieldProps<T>) {
  return (
    <div class="space-y-1.5">
      <label for={props.id} class="text-[11px] font-normal text-muted-foreground">
        {props.label}
      </label>
      <select
        id={props.id}
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value as T)}
        class="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <For each={props.options}>
          {(option) => (
            <option value={option.value} label={option.short} class="bg-background text-foreground">
              {option.label}
            </option>
          )}
        </For>
      </select>
    </div>
  );
}
