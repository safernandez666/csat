import { useMemo, useState } from "react";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select } from "../components/ui/select";
import { useControls } from "../hooks/use-api";
import { api } from "../lib/api";
import { Shield, ShieldCheck } from "lucide-react";
import type { Control, Safeguard } from "../types";

type IG = "ig1" | "ig2" | "ig3";

const IG_META: Record<IG, { label: string; sub: string; textClass: string; bgClass: string }> = {
  ig1: { label: "IG1", sub: "Wave 1 — Essential", textClass: "text-success", bgClass: "bg-success" },
  ig2: { label: "IG2", sub: "Wave 2 — Intermediate", textClass: "text-info", bgClass: "bg-info" },
  ig3: { label: "IG3", sub: "Wave 3 — Advanced", textClass: "text-purple", bgClass: "bg-purple-500" },
};

const IG_KEYS: IG[] = ["ig1", "ig2", "ig3"];

const STATUS_LABEL: Record<string, string> = {
  not_implemented: "Not Implemented",
  in_progress: "In Progress",
  implemented: "Implemented",
};

const STATUS_CLASS: Record<string, string> = {
  not_implemented: "text-muted",
  in_progress: "text-info",
  implemented: "text-success",
};

export default function ImplementationWavesPage() {
  const { data: controls, loading, refresh } = useControls();
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
        if (sg.implementation_status === "implemented") stats[ig].implemented += 1;
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
        if (hideImplemented && s.implementation_status === "implemented") return false;
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
      alert(err.message || "Failed to update safeguard");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Layout
      title="Implementation Waves"
      subtitle="Plan your compliance one wave at a time — IG1 → IG2 → IG3"
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
                    <span className="text-xs text-muted">{meta.sub}</span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-accent">
                      Active
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
              ? `${totalActivePending} safeguard${totalActivePending === 1 ? "" : "s"} pending across ${groups.length} control${groups.length === 1 ? "" : "s"}`
              : `All ${totalActive} safeguards implemented`}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideImplemented}
              onChange={(e) => setHideImplemented(e.target.checked)}
              className="rounded border-border"
            />
            Hide implemented
          </label>
        </div>

        {/* Body */}
        {loading && !controls && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted">Loading…</CardContent>
          </Card>
        )}

        {!loading && groups.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-success mb-3" />
              <p className="text-sm font-medium">
                Nothing pending in {IG_META[activeIG].label} with the current filter.
              </p>
              {hideImplemented && totalActiveImpl < totalActive && (
                <p className="mt-1 text-xs text-muted">
                  Uncheck "Hide implemented" to review what's already done.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {groups.map(({ control, safeguards }) => {
          const igTotal = control.safeguards.filter((s) => (s.ig || "ig1") === activeIG).length;
          const igImpl = control.safeguards.filter(
            (s) => (s.ig || "ig1") === activeIG && s.implementation_status === "implemented"
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
                        {control.group}
                      </span>
                    </div>
                    <CardTitle className="text-base mt-1">{control.name}</CardTitle>
                    <div className="text-xs text-muted mt-1">
                      {igImpl}/{igTotal} {IG_META[activeIG].label} safeguards implemented · {ctrlPct}%
                    </div>
                  </div>
                  <a
                    href={`/controls/${control.id}`}
                    className="text-xs text-muted hover:text-accent shrink-0 mt-1"
                  >
                    Open control →
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {safeguards.map((sg) => (
                  <div
                    key={sg.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted">{sg.safeguard_id}</span>
                        <span className={`text-[10px] uppercase font-bold ${STATUS_CLASS[sg.implementation_status] || "text-muted"}`}>
                          {STATUS_LABEL[sg.implementation_status] || sg.implementation_status}
                        </span>
                      </div>
                      <div className="text-sm font-medium mt-0.5">{sg.title}</div>
                      {sg.description && (
                        <p className="mt-1 text-xs text-muted line-clamp-2">{sg.description}</p>
                      )}
                    </div>
                    <Select
                      value={sg.implementation_status}
                      disabled={savingId === sg.id}
                      onChange={(e) => updateStatus(control.id, sg.id, e.target.value)}
                      className="w-40 text-sm shrink-0"
                    >
                      <option value="not_implemented">Not Implemented</option>
                      <option value="in_progress">In Progress</option>
                      <option value="implemented">Implemented</option>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
