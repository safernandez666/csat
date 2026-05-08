import { useMemo, useState } from "react";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { SafeguardStatusBadge, SAFEGUARD_STATUS_OPTIONS } from "../components/safeguard-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useControls } from "../hooks/use-api";
import { api } from "../lib/api";
import { Shield, ShieldCheck, MoreHorizontal, Loader2 } from "lucide-react";
import type { Control, Safeguard } from "../types";
import { useTranslation } from "../hooks/use-translation";
import { localizeControl } from "../lib/cis-catalog-i18n";

type IG = "ig1" | "ig2" | "ig3";

const IG_META: Record<IG, { label: string; subKey: string; textClass: string; bgClass: string }> = {
  ig1: { label: "IG1", subKey: "waves.ig1.sub", textClass: "text-success", bgClass: "bg-success" },
  ig2: { label: "IG2", subKey: "waves.ig2.sub", textClass: "text-info", bgClass: "bg-info" },
  ig3: { label: "IG3", subKey: "waves.ig3.sub", textClass: "text-purple", bgClass: "bg-purple-500" },
};

const IG_KEYS: IG[] = ["ig1", "ig2", "ig3"];

export default function ImplementationWavesPage() {
  const { t, lang } = useTranslation();
  const { data: rawControls, loading, refresh } = useControls();
  const controls = useMemo(
    () => (rawControls ? rawControls.map((c) => localizeControl(c, lang)) : null),
    [rawControls, lang]
  );
  const [activeIG, setActiveIG] = useState<IG>("ig1");
  const [hideImplemented, setHideImplemented] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Per-wave aggregate progress (across all controls)
  const igStats = useMemo(() => {
    const stats: Record<IG, { total: number; implemented: number }> = {
      ig1: { total: 0, implemented: 0 },
      ig2: { total: 0, implemented: 0 },
      ig3: { total: 0, implemented: 0 },
    };
    if (!controls) return stats;
    for (const c of controls) {
      for (const sg of c.safeguards) {
        const ig = (sg.ig || "ig1") as IG;
        if (!stats[ig]) continue;
        stats[ig].total += 1;
        if (sg.implementation_status === "implemented_all") stats[ig].implemented += 1;
      }
    }
    return stats;
  }, [controls]);

  // Controls with at least one safeguard matching the active filter
  const groups = useMemo(() => {
    if (!controls) return [];
    const out: { control: Control; safeguards: Safeguard[] }[] = [];
    for (const c of controls) {
      const sgs = c.safeguards.filter((s) => {
        if ((s.ig || "ig1") !== activeIG) return false;
        if (hideImplemented && s.implementation_status === "implemented_all") return false;
        return true;
      });
      if (sgs.length > 0) out.push({ control: c, safeguards: sgs });
    }
    return out;
  }, [controls, activeIG, hideImplemented]);

  const totalActive = igStats[activeIG].total;
  const totalActiveImpl = igStats[activeIG].implemented;
  const totalActivePending = totalActive - totalActiveImpl;

  const updateStatus = async (controlId: number, sgId: number, newStatus: string) => {
    setSavingId(sgId);
    try {
      await api.updateSafeguard(controlId, sgId, newStatus);
      refresh();
    } catch (err: any) {
      alert(err.message || t("control_detail.update_failed"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Layout
      title={t("waves.title")}
      subtitle={t("waves.subtitle")}
    >
      <div className="space-y-6">
        {/* Wave selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IG_KEYS.map((ig) => {
            const stat = igStats[ig];
            const pct = stat.total > 0 ? Math.round((stat.implemented / stat.total) * 100) : 0;
            const meta = IG_META[ig];
            const isActive = activeIG === ig;
            return (
              <button
                key={ig}
                type="button"
                onClick={() => setActiveIG(ig)}
                className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
                  isActive
                    ? "border-accent bg-accent/5 shadow-sm"
                    : "border-border bg-card/50 hover:bg-card hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${meta.textClass}`}>{meta.label}</span>
                    <span className="text-xs text-muted">{t(meta.subKey)}</span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-accent">
                      {t("waves.active")}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight">{pct}%</span>
                  <span className="text-xs text-muted">
                    {stat.implemented} / {stat.total}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${meta.bgClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-muted">
            <span className={`font-semibold ${IG_META[activeIG].textClass}`}>
              {IG_META[activeIG].label}
            </span>
            {" — "}
            {totalActivePending > 0
              ? t("waves.pending_summary", {
                  pending: totalActivePending,
                  plural: totalActivePending === 1 ? "" : "s",
                  controls: groups.length,
                  ctrlWord: t(groups.length === 1 ? "common.control_word" : "common.controls_word"),
                })
              : t("waves.all_implemented", { total: totalActive })}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideImplemented}
              onChange={(e) => setHideImplemented(e.target.checked)}
              className="rounded border-border"
            />
            {t("waves.hide_implemented")}
          </label>
        </div>

        {/* Body */}
        {loading && !controls && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted">{t("waves.loading")}</CardContent>
          </Card>
        )}

        {!loading && groups.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-success mb-3" />
              <p className="text-sm font-medium">
                {t("waves.empty", { ig: IG_META[activeIG].label })}
              </p>
              {hideImplemented && totalActiveImpl < totalActive && (
                <p className="mt-1 text-xs text-muted">
                  {t("waves.empty_hint")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {groups.map(({ control, safeguards }) => {
          const igTotal = control.safeguards.filter((s) => (s.ig || "ig1") === activeIG).length;
          const igImpl = control.safeguards.filter(
            (s) => (s.ig || "ig1") === activeIG && s.implementation_status === "implemented_all"
          ).length;
          const ctrlPct = igTotal > 0 ? Math.round((igImpl / igTotal) * 100) : 0;

          return (
            <Card key={control.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Shield className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-xs font-mono text-muted">CIS {control.cis_id}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted">
                        {t(`group.${control.group.toLowerCase()}`)}
                      </span>
                    </div>
                    <CardTitle className="text-base mt-1">{control.name}</CardTitle>
                    <div className="text-xs text-muted mt-1">
                      {t("waves.controls_summary", { impl: igImpl, total: igTotal, ig: IG_META[activeIG].label, pct: ctrlPct })}
                    </div>
                  </div>
                  <a
                    href={`/controls/${control.id}`}
                    className="text-xs text-muted hover:text-accent shrink-0 mt-1"
                  >
                    {t("controls.open")}
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {safeguards.map((sg) => {
                  const isSaving = savingId === sg.id;
                  return (
                    <div
                      key={sg.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted">{sg.safeguard_id}</span>
                          <SafeguardStatusBadge status={sg.implementation_status} />
                        </div>
                        <div className="text-sm font-medium mt-1">{sg.title}</div>
                        {sg.description && (
                          <p className="mt-1 text-xs text-muted line-clamp-2">{sg.description}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          disabled={isSaving}
                          aria-label={t("control_detail.change_status_aria")}
                          className="size-8 shrink-0 rounded-md border border-transparent hover:border-border disabled:opacity-50"
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
                              onClick={() => updateStatus(control.id, sg.id, opt.value)}
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
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
