import { cn } from "../lib/utils";

interface UserRoleBadgeProps {
  role: string;
  className?: string;
}

const roleColors: Record<string, string> = {
  Admin: "text-purple bg-purple-dim border-purple-border",
  "Security Analyst": "text-info bg-info-dim border-info-border",
  Auditor: "text-info bg-info-dim border-info-border",
  Viewer: "text-muted bg-card border-border",
};

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        roleColors[role] || "text-muted bg-card border-border",
        className
      )}
    >
      {role}
    </span>
  );
}
