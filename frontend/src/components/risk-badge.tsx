import { cn, riskColor } from "../lib/utils";
import { useTranslation } from "../hooks/use-translation";

interface RiskBadgeProps {
  risk: string;
  className?: string;
}

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  const { t } = useTranslation();
  const known = ["critical", "high", "medium", "low"].includes(risk);
  const label = known ? t(`risk.${risk}`) : risk.charAt(0).toUpperCase() + risk.slice(1);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        riskColor(risk),
        className
      )}
    >
      {label}
    </span>
  );
}
