import { LINKS, PARTS } from "./layout";

function curve(fromX: number, fromY: number, toX: number, toY: number, bend: number) {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy) || 1;
  const controlX = midX + (-dy / length) * bend;
  const controlY = midY + (dx / length) * bend;
  return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
}

export function DiagramLinks() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full text-primary"
      fill="none"
    >
      {LINKS.map((link) => {
        const from = PARTS.find((part) => part.id === link.id);
        if (!from) return null;
        const midX = (from.x + link.to.x) / 2;
        const midY = (from.y + link.to.y) / 2;
        return (
          <g key={link.id}>
            <path
              d={curve(from.x, from.y, link.to.x, link.to.y, link.bend)}
              stroke="currentColor"
              strokeWidth="1.25"
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
              opacity="0.9"
            />
            <circle cx={from.x} cy={from.y} r="0.7" fill="currentColor" />
            <circle cx={midX} cy={midY} r="0.45" fill="currentColor" />
            <circle cx={link.to.x} cy={link.to.y} r="0.55" fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}
