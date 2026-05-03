import { cn, statusColor } from "../lib/utils";
import { useTranslation } from "../hooks/use-translation";

interface ControlStatusBadgeProps {
  status: string;
  className?: string;
}

export function ControlStatusBadge({ status, className }: ControlStatusBadgeProps) {
  const { t } = useTranslation();
  const known = ["implemented", "in_progress", "needs_review", "not_implemented"].includes(status);
  const label = known
    ? t(`status.${status}.long`)
    : status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusColor(status),
        className
      )}
    >
      {label}
    </span>
  );
}
