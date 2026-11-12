// www.shadcnloaders.com

type LoaderProps = {
  className?: string;
};

export function BlocksWave({ className = "" }: LoaderProps) {
  const primaryBgClass = "bg-primary";
  return (
    <div className={`flex items-end gap-1 h-8 ${className}`}>
      <style>{`
        @keyframes waveBob {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-3 ${primaryBgClass} rounded-sm`}
          style={{
            height: `${[34, 65, 100, 65, 34][i]}%`,
            transformOrigin: "bottom",
            animation: `waveBob 1.1s ease-in-out infinite`,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

import * as React from "react";

type MorphingShapeProps = {
  className?: string;
  containerSize?: string;
};

const STREAKS = [
  { angle: 18, delay: 0 },
  { angle: 86, delay: 0.4 },
  { angle: 142, delay: 0.85 },
  { angle: 206, delay: 0.2 },
  { angle: 268, delay: 0.65 },
  { angle: 332, delay: 1.05 },
];

export function LightBurst({ className = "h-full w-full" }: { className?: string }) {
  return (
    <div className={`pointer-events-none relative overflow-visible ${className}`} aria-hidden>
      <style>{`
            @keyframes loader-streak {
              0% {
                opacity: 0;
                transform: rotate(var(--streak-angle)) translateX(18px) scaleX(0.35);
              }
              12% { opacity: 1; }
              48% {
                opacity: 0;
                transform: rotate(var(--streak-angle)) translateX(52px) scaleX(1);
              }
              100% {
                opacity: 0;
                transform: rotate(var(--streak-angle)) translateX(52px) scaleX(1);
              }
            }
          `}</style>
      {STREAKS.map((streak) => (
        <span
          key={streak.angle}
          className="absolute top-1/2 left-1/2 h-0.5 w-5 origin-left rounded-full"
          style={{
            ["--streak-angle" as string]: `${streak.angle}deg`,
            background: "linear-gradient(90deg, transparent, white)",
            boxShadow: "0 0 8px 1px var(--color-primary)",
            animation: "loader-streak 2.2s ease-out infinite",
            animationDelay: `${streak.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export function MorphingShape({ className = "", containerSize = "w-10 h-10" }: MorphingShapeProps) {
  const primaryBgClass = "bg-primary";
  return (
    <div className={`relative overflow-visible ${containerSize} ${className}`}>
      <style>{`
            @keyframes loader-morph-shape {
              0%, 100% { border-radius: 4px; transform: rotate(0deg); }
              50% { border-radius: 50%; transform: rotate(180deg); }
            }
          `}</style>
      <LightBurst className="absolute inset-0 " />
      <div
        className={`relative z-10 w-full h-full ${primaryBgClass}`}
        style={{ animation: "loader-morph-shape 2s ease-in-out infinite" }}
      />
    </div>
  );
}
