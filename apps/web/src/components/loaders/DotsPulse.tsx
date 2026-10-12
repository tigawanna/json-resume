import { cn } from "@/lib/utils";

const DOT_SIZES = {
  sm: "size-1",
  md: "size-1.5",
  lg: "size-2",
  xl: "size-3",
} as const;

interface DotsPulseProps {
  size?: keyof typeof DOT_SIZES;
  className?: string;
  label?: string;
}

export function DotsPulse({ size = "md", className, label = "Loading" }: DotsPulseProps) {
  return (
    <div role="status" aria-label={label} className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "animate-bounce rounded-full bg-primary motion-reduce:animate-pulse",
            DOT_SIZES[size],
          )}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
