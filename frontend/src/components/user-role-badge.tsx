import { cn } from "../lib/utils";
import { useTranslation } from "../hooks/use-translation";

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

const roleI18nKeys: Record<string, string> = {
  Admin: "users.role.admin",
  "Security Analyst": "users.role.security_analyst",
  Auditor: "users.role.auditor",
  Viewer: "users.role.viewer",
};

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  const { t } = useTranslation();
  const key = roleI18nKeys[role];
  const label = key ? t(key) : role;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        roleColors[role] || "text-muted bg-card border-border",
        className
      )}
    >
      {label}
    </span>
  );
}
