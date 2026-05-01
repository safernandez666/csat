import { cn } from "../../lib/utils";

interface ShineBorderProps {
  children: React.ReactNode;
  className?: string;
  borderClassName?: string;
  borderWidth?: number;
  duration?: number;
  shineColor?: string;
}

export function ShineBorder({
  children,
  className,
  borderClassName,
  borderWidth = 1,
  duration = 14,
  shineColor = "#3b82f6",
}: ShineBorderProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{ borderRadius: "inherit" }}
    >
      {/* Animated border layer */}
      <div
        className={cn("pointer-events-none absolute inset-0 rounded-xl", borderClassName)}
        style={{
          padding: borderWidth,
          background: `conic-gradient(from 0deg, transparent 0%, ${shineColor} 20%, transparent 40%, transparent 60%, ${shineColor} 80%, transparent 100%)`,
          animation: `shine-spin ${duration}s linear infinite`,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
      />
      {children}
    </div>
  );
}
