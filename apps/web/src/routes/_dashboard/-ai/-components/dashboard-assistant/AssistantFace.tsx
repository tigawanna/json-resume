import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface AssistantFaceProps {
  className?: string;
  /** Eyes glance side to side while the assistant works. */
  working?: boolean;
}

/** The dashboard assistant's friendly face. Inherits `currentColor`. */
export function AssistantFace({ className, working = false }: AssistantFaceProps) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animate = !reduceMotion;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-6", className)}
      data-test="assistant-face"
    >
      <line x1="16" y1="4.5" x2="16" y2="7.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="3.5" r="1.8" fill="currentColor">
        {animate && working ? (
          <animate attributeName="opacity" values="1;0.35;1" dur="1.2s" repeatCount="indefinite" />
        ) : null}
      </circle>
      <rect
        x="4.5"
        y="7.5"
        width="23"
        height="19"
        rx="8"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <g>
        {animate && working ? (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;-1.4 0;0 0;1.4 0;0 0"
            dur="1.6s"
            repeatCount="indefinite"
          />
        ) : null}
        {[12, 20].map((cx) => (
          <ellipse key={cx} cx={cx} cy="15.5" rx="2" ry="2.4" fill="currentColor">
            {animate ? (
              <animate
                attributeName="ry"
                values="2.4;2.4;0.3;2.4;2.4"
                keyTimes="0;0.92;0.95;0.98;1"
                dur="4.5s"
                repeatCount="indefinite"
              />
            ) : null}
          </ellipse>
        ))}
      </g>
      <path
        d="M11.5 20.5 Q16 24.2 20.5 20.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
