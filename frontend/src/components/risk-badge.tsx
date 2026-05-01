import { cn, riskColor } from "../lib/utils";

interface RiskBadgeProps {
  risk: string;
  className?: string;
}

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        riskColor(risk),
        className
      )}
    >
      {risk.charAt(0).toUpperCase() + risk.slice(1)}
    </span>
  );
}
