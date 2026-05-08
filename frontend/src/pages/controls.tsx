import { useMemo, useState } from "react";
import { useControls } from "../hooks/use-api";
import { localizeControl } from "../lib/cis-catalog-i18n";
import { Layout } from "../components/layout";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { ControlStatusBadge } from "../components/control-status-badge";
import { RiskBadge } from "../components/risk-badge";
import { Search, Layers } from "lucide-react";
import type { Control } from "../types";
import { useTranslation } from "../hooks/use-translation";

const groupColors: Record<string, string> = {
  Basic: "text-success",
  Foundational: "text-info",
  Organizational: "text-purple",
};

function IgProgressMini({ control }: { control: Control }) {
  const counts = {
    ig1: { total: 0, impl: 0 },
    ig2: { total: 0, impl: 0 },
    ig3: { total: 0, impl: 0 },
  };
  control.safeguards.forEach((sg) => {
    const k = (sg.ig || "ig1") as keyof typeof counts;
    if (counts[k]) {
      counts[k].total += 1;
      if (sg.implementation_status === "implemented_all") counts[k].impl += 1;
    }
  });
  const bars = [
    { key: "ig1" as const, label: "IG1", color: "bg-success" },
    { key: "ig2" as const, label: "IG2", color: "bg-info" },
    { key: "ig3" as const, label: "IG3", color: "bg-purple-500" },
  ];
  return (
    <div className="mt-2 flex items-center gap-3">
      {bars.map((b) => {
        const c = counts[b.key];
        const pct = c.total > 0 ? Math.round((c.impl / c.total) * 100) : 0;
        return (
          <div key={b.key} className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-muted shrink-0">{b.label}</span>
            <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
              <div className={`h-full rounded-full ${b.color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-muted shrink-0">{c.impl}/{c.total}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ControlsPage() {
  const { t, lang } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const { data, loading, error } = useControls({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(riskFilter ? { risk: riskFilter } : {}),
  });

  const localized = useMemo(
    () => (data || []).map((c) => localizeControl(c, lang)),
    [data, lang]
  );

  const filtered = localized.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.cis_id.toLowerCase().includes(q) ||
      (c.objective || "").toLowerCase().includes(q);
    const matchesGroup = groupFilter ? c.group === groupFilter : true;
    return matchesSearch && matchesGroup;
  });

  return (
    <Layout title={t("controls.title")} subtitle={t("controls.subtitle")}>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                placeholder={t("controls.search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40" aria-label={t("controls.filter_status")}>
                <option value="">{t("common.all")} — {t("common.status")}</option>
                <option value="not_implemented">{t("status.not_implemented.long")}</option>
                <option value="in_progress">{t("status.in_progress.long")}</option>
                <option value="implemented">{t("status.implemented.long")}</option>
                <option value="needs_review">{t("status.needs_review.long")}</option>
              </Select>
              <Select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="w-40" aria-label={t("controls.filter_risk")}>
                <option value="">{t("common.all")} — {t("control_detail.risk_level")}</option>
                <option value="critical">{t("risk.critical")}</option>
                <option value="high">{t("risk.high")}</option>
                <option value="medium">{t("risk.medium")}</option>
                <option value="low">{t("risk.low")}</option>
              </Select>
              <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-44" aria-label={t("controls.filter_group")}>
                <option value="">{t("common.all")} — {t("control_detail.group")}</option>
                <option value="Basic">{t("group.basic")} (1-6)</option>
                <option value="Foundational">{t("group.foundational")} (7-16)</option>
                <option value="Organizational">{t("group.organizational")} (17-18)</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-center text-muted py-8">{t("common.loading")}</p>}
      {error && <p className="text-center text-danger py-8">{error}</p>}

      <div className="space-y-3">
        {filtered.map((control) => (
          <a
            key={control.id}
            href={`/controls/${control.id}`}
            className="block rounded-xl border border-border bg-card/95 p-5 shadow-sm transition-colors hover:border-accent/30 hover:bg-card"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono text-muted">CIS {control.cis_id}</span>
                  <ControlStatusBadge status={control.status} />
                  <RiskBadge risk={control.risk_level} />
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${groupColors[control.group] || "text-muted"}`}>
                    <Layers className="h-3 w-3" />
                    {t(`group.${control.group.toLowerCase()}`)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold truncate">{control.name}</h3>
                {control.objective && (
                  <p className="mt-1 text-xs text-muted line-clamp-2">{control.objective}</p>
                )}
                <IgProgressMini control={control} />
              </div>
              <div className="text-right text-xs text-muted shrink-0">
                <div>{t("controls.safeguards_count", { count: control.safeguards.length })}</div>
                {control.owner_name && <div>{t("control_detail.owner")}: {control.owner_name}</div>}
              </div>
            </div>
          </a>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-muted py-8">{t("controls.no_results")}</p>
        )}
      </div>
    </Layout>
  );
}
