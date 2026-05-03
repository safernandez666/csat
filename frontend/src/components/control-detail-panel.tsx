
import { useState } from "react";
import { Shield, Calendar, User, Layers, MoreHorizontal, Loader2 } from "lucide-react";
import type { Control } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ControlStatusBadge } from "./control-status-badge";
import { RiskBadge } from "./risk-badge";
import { SafeguardStatusBadge, SAFEGUARD_STATUS_OPTIONS } from "./safeguard-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { api } from "../lib/api";
import { formatDateShort } from "../lib/utils";
import { useTranslation } from "../hooks/use-translation";

interface ControlDetailPanelProps {
  control: Control;
  onUpdate?: () => void;
  onControlChanged?: (next: Control) => void;
}

export function ControlDetailPanel({ control, onUpdate, onControlChanged }: ControlDetailPanelProps) {
  const { t } = useTranslation();
  const [savingId, setSavingId] = useState<number | null>(null);
  const implementedCount = control.safeguards.filter((s) => s.implementation_status === "implemented").length;
  const totalSafeguards = control.safeguards.length;
  const progress = totalSafeguards > 0 ? Math.round((implementedCount / totalSafeguards) * 100) : 0;

  const groupColors: Record<string, string> = {
    Basic: "text-success bg-success-dim border-success-border",
    Foundational: "text-info bg-info-dim border-info-border",
    Organizational: "text-purple bg-purple-dim border-purple-border",
  };

  // IG progress per control
  const igCounts = {
    ig1: { total: 0, implemented: 0 },
    ig2: { total: 0, implemented: 0 },
    ig3: { total: 0, implemented: 0 },
  };
  control.safeguards.forEach((sg) => {
    const ig = sg.ig || "ig1";
    if (igCounts[ig as keyof typeof igCounts]) {
      igCounts[ig as keyof typeof igCounts].total += 1;
      if (sg.implementation_status === "implemented") {
        igCounts[ig as keyof typeof igCounts].implemented += 1;
      }
    }
  });

  const igMeta = [
    { key: "ig1" as const, label: "IG1", color: "bg-success" },
    { key: "ig2" as const, label: "IG2", color: "bg-info" },
    { key: "ig3" as const, label: "IG3", color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                <span className="text-xs font-mono text-muted">CIS Control {control.cis_id}</span>
              </div>
              <CardTitle>{control.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <ControlStatusBadge status={control.status} />
              <RiskBadge risk={control.risk_level} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t("control_detail.group")}:</span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${groupColors[control.group] || "text-muted bg-card border-border"}`}>
              {t(`group.${control.group.toLowerCase()}`)}
            </span>
          </div>
          {control.objective && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">{t("control_detail.objective")}</h4>
              <p className="text-sm leading-relaxed">{control.objective}</p>
            </div>
          )}
          {control.implementation_guidance && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">{t("control_detail.guidance")}</h4>
              <p className="text-sm leading-relaxed">{control.implementation_guidance}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted" />
              <span className="text-muted">{t("control_detail.owner")}:</span>
              <span>{control.owner_name || t("common.unassigned")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted" />
              <span className="text-muted">{t("control_detail.due")}:</span>
              <span>{formatDateShort(control.due_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted" />
              <span className="text-muted">{t("control_detail.review")}:</span>
              <span>{formatDateShort(control.review_date)}</span>
            </div>
          </div>

          {/* IG progress bars per control */}
          <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("control_detail.waves_title")}</h4>
            {igMeta.map((ig) => {
              const counts = igCounts[ig.key];
              const pct = counts.total > 0 ? Math.round((counts.implemented / counts.total) * 100) : 0;
              return (
                <div key={ig.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{ig.label}</span>
                    <span className="text-muted">{counts.implemented}/{counts.total} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-border">
                    <div className={`h-2 rounded-full ${ig.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("control_detail.safeguards_progress")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-muted">{t("control_detail.implemented_of_total", { implemented: implementedCount, total: totalSafeguards })}</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-border">
            <div
              className="h-2 rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {control.safeguards.map((sg) => {
              const isSaving = savingId === sg.id;
              const changeStatus = async (newStatus: string) => {
                if (newStatus === sg.implementation_status) return;
                setSavingId(sg.id);
                try {
                  const updatedControl = await api.updateSafeguard(control.id, sg.id, newStatus);
                  if (onControlChanged) {
                    onControlChanged(updatedControl);
                  } else {
                    onUpdate?.();
                  }
                } catch (err: any) {
                  alert(err.message || t("control_detail.update_failed"));
                } finally {
                  setSavingId(null);
                }
              };
              return (
                <div key={sg.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-mono text-muted">{sg.safeguard_id}</div>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        sg.ig === "ig1" ? "bg-success-dim text-success" :
                        sg.ig === "ig2" ? "bg-info-dim text-info" :
                        "bg-purple-dim text-purple"
                      }`}>
                        {sg.ig?.toUpperCase() || "IG1"}
                      </span>
                    </div>
                    <div className="text-sm font-medium">{sg.title}</div>
                    {sg.description && (
                      <p className="mt-1 text-xs text-muted line-clamp-3">{sg.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SafeguardStatusBadge status={sg.implementation_status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        disabled={isSaving}
                        aria-label={t("control_detail.change_status_aria")}
                        className="size-8 rounded-md border border-transparent hover:border-border disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="size-4" />
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>{t("control_detail.change_status")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {SAFEGUARD_STATUS_OPTIONS.map((opt) => (
                          <DropdownMenuItem
                            key={opt.value}
                            onClick={() => changeStatus(opt.value)}
                            disabled={isSaving || opt.value === sg.implementation_status}
                          >
                            <SafeguardStatusBadge status={opt.value} className="text-[11px]" />
                            {opt.value === sg.implementation_status && (
                              <span className="ml-auto text-[10px] text-muted">{t("control_detail.current")}</span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
