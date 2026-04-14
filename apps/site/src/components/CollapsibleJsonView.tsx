import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

const LONG_STRING = 120;
const PREVIEW_STRING = 72;

function getPreview(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    return `{${keys.length} keys}`;
  }
  if (typeof value === "string") {
    if (value.length <= PREVIEW_STRING) return JSON.stringify(value);
    return `${JSON.stringify(value.slice(0, PREVIEW_STRING))}…`;
  }
  return String(value);
}

function JsonPrimitive({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-muted-foreground">null</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-foreground">{value ? "true" : "false"}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-foreground">{value}</span>;
  }
  if (typeof value === "string") {
    if (value.length <= LONG_STRING) {
      return (
        <span className="text-foreground wrap-break-word whitespace-pre-wrap">{JSON.stringify(value)}</span>
      );
    }
    return (
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger
          type="button"
          className="text-foreground hover:bg-muted/50 wrap-break-word max-w-full rounded px-0.5 text-left font-mono text-xs underline-offset-2 hover:underline"
        >
          {JSON.stringify(value.slice(0, PREVIEW_STRING))}…
          <span className="text-muted-foreground ml-1 text-[10px] no-underline">(expand)</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="bg-muted/30 mt-1 max-h-80 overflow-auto rounded border p-2 font-mono text-xs wrap-break-word whitespace-pre-wrap">
            {value}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  return <span className="text-foreground">{String(value)}</span>;
}

function JsonInner({ value, depth }: { value: unknown; depth: number }) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-col gap-0.5">
        {value.map((item, i) => (
          <JsonEntry key={i} name={`[${i}]`} value={item} depth={depth} />
        ))}
      </div>
    );
  }
  if (value !== null && typeof value === "object") {
    return (
      <div className="flex flex-col gap-0.5">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <JsonEntry key={k} name={k} value={v} depth={depth} />
        ))}
      </div>
    );
  }
  return <JsonPrimitive value={value} />;
}

function JsonEntry({ name, value, depth }: { name: string; value: unknown; depth: number }) {
  const composite = value !== null && (Array.isArray(value) || typeof value === "object");

  if (!composite) {
    return (
      <div className="font-mono text-xs">
        <span className="text-primary">{JSON.stringify(name)}</span>
        <span className="text-muted-foreground">: </span>
        <JsonPrimitive value={value} />
      </div>
    );
  }

  return (
    <Collapsible defaultOpen={false} className="group min-w-0">
      <div className="flex items-start gap-0.5">
        <CollapsibleTrigger
          type="button"
          className="hover:bg-muted/40 flex min-w-0 flex-1 items-start gap-1 rounded px-1 py-0.5 text-left font-mono text-xs"
          data-test={depth === 0 ? `json-node-${name}` : undefined}
        >
          <ChevronRight className="text-muted-foreground mt-0.5 size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
          <span>
            <span className="text-primary">{JSON.stringify(name)}</span>
            <span className="text-muted-foreground">: </span>
            <span className="text-muted-foreground">{getPreview(value)}</span>
          </span>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="border-border ml-1.5 mt-0.5 space-y-0.5 border-l pl-2">
        <JsonInner value={value} depth={depth + 1} />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CollapsibleJsonView({ data }: { data: unknown }) {
  if (data === null || typeof data !== "object") {
    return (
      <div className="bg-muted/20 font-mono text-xs">
        <JsonPrimitive value={data} />
      </div>
    );
  }

  return (
    <div
      className="bg-muted/20 max-h-[min(70vh,560px)] overflow-auto rounded-lg border p-3 font-mono text-xs"
      data-test="collapsible-json-view"
    >
      <JsonInner value={data} depth={0} />
    </div>
  );
}
