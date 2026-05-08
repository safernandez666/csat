import { CheckCircle2, Clock, Circle, MinusCircle, AlertCircle } from "lucide-react";
import { Badge, type BadgeProps } from "./ui/badge";
import { cn } from "../lib/utils";
import { useTranslation } from "../hooks/use-translation";

type SafeguardStatus =
  | "implemented_all"
  | "implemented_most"
  | "parts_implemented"
  | "not_implemented"
  | "not_applicable"
  | string;

const STATUS_META: Record<
  string,
  { i18nKey: string; variant: BadgeProps["variant"]; icon: React.ComponentType<{ className?: string }> }
> = {
  implemented_all: { i18nKey: "status.implemented_all", variant: "success", icon: CheckCircle2 },
  implemented_most: { i18nKey: "status.implemented_most", variant: "info", icon: CheckCircle2 },
  parts_implemented: { i18nKey: "status.parts_implemented", variant: "warning", icon: Clock },
  not_implemented: { i18nKey: "status.not_implemented", variant: "secondary", icon: Circle },
  not_applicable: { i18nKey: "status.not_applicable", variant: "muted", icon: MinusCircle },
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
  const Icon = meta ? meta.icon : AlertCircle;
  return (
    <Badge variant={variant} className={cn("gap-1.5 capitalize", className)}>
      {withIcon && <Icon className="size-3" />}
      {label}
    </Badge>
  );
}

export const SAFEGUARD_STATUS_OPTIONS: { value: string; i18nKey: string }[] = [
  { value: "implemented_all", i18nKey: "status.implemented_all" },
  { value: "implemented_most", i18nKey: "status.implemented_most" },
  { value: "parts_implemented", i18nKey: "status.parts_implemented" },
  { value: "not_implemented", i18nKey: "status.not_implemented" },
  { value: "not_applicable", i18nKey: "status.not_applicable" },
];
