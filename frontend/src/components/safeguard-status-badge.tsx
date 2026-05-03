import { CheckCircle2, Clock, Circle, Eye } from "lucide-react";
import { Badge, type BadgeProps } from "./ui/badge";
import { cn } from "../lib/utils";
import { useTranslation } from "../hooks/use-translation";

type SafeguardStatus = "implemented" | "in_progress" | "not_implemented" | "needs_review" | string;

const STATUS_META: Record<string, { i18nKey: string; variant: BadgeProps["variant"]; icon: React.ComponentType<{ className?: string }> }> = {
  implemented: { i18nKey: "status.implemented", variant: "success", icon: CheckCircle2 },
  in_progress: { i18nKey: "status.in_progress", variant: "default", icon: Clock },
  needs_review: { i18nKey: "status.needs_review", variant: "warning", icon: Eye },
  not_implemented: { i18nKey: "status.not_implemented", variant: "secondary", icon: Circle },
};

interface SafeguardStatusBadgeProps {
  status: SafeguardStatus;
  className?: string;
  withIcon?: boolean;
}

export function SafeguardStatusBadge({ status, className, withIcon = true }: SafeguardStatusBadgeProps) {
  const { t } = useTranslation();
  const meta = STATUS_META[status];
  const label = meta ? t(meta.i18nKey) : status.replace(/_/g, " ");
  const variant = meta ? meta.variant : ("secondary" as BadgeProps["variant"]);
  const Icon = meta ? meta.icon : Circle;
  return (
    <Badge variant={variant} className={cn("gap-1.5 capitalize", className)}>
      {withIcon && <Icon className="size-3" />}
      {label}
    </Badge>
  );
}

export const SAFEGUARD_STATUS_OPTIONS: { value: string; i18nKey: string }[] = [
  { value: "implemented", i18nKey: "status.implemented" },
  { value: "in_progress", i18nKey: "status.in_progress" },
  { value: "not_implemented", i18nKey: "status.not_implemented" },
];
