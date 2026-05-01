import { cn, statusLabel, statusColor } from "../lib/utils";

interface ControlStatusBadgeProps {
  status: string;
  className?: string;
}

export function ControlStatusBadge({ status, className }: ControlStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusColor(status),
        className
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
