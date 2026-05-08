import { useDashboard } from "../hooks/use-api";
import { Layout } from "../components/layout";
import { ComplianceSummaryCard } from "../components/compliance-summary-card";
import { StatusBarChart } from "../components/status-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ControlStatusBadge } from "../components/control-status-badge";

import { formatDateShort } from "../lib/utils";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip as ShadTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";
import { Calendar, Activity, Target, AlertCircle } from "lucide-react";
import { Spinner } from "../components/ui/spinner";
import { useTranslation } from "../hooks/use-translation";
import { localizeControlName } from "../lib/cis-catalog-i18n";
import { useAppSettings } from "../contexts/app-settings";
import { BENCHMARKS, getGroupScores, getIGScores, getSpiderData } from "../lib/industry-benchmarks";

const RISK_COLORS: Record<string, string> = {
  critical: "var(--color-danger)",
  high: "var(--color-orange)",
  medium: "var(--color-warning)",
  low: "var(--color-success)",
};

const RADAR_COLORS: Record<string, string> = {
  Basic: "var(--color-success)",
  Foundational: "var(--color-info)",
  Organizational: "var(--color-purple)",
};

const IG_RADAR_COLORS: Record<string, string> = {
  IG1: "var(--color-success)",
  IG2: "var(--color-info)",
  IG3: "var(--color-purple)",
};

/* shadcn chart configs */
const groupChartConfig = {
  score: { label: "Score", color: "var(--color-info)" },
};

const igChartConfig = {
  score: { label: "Score", color: "var(--color-success)" },
};



export default function DashboardPage() {
  const { t, lang } = useTranslation();
  const { settings } = useAppSettings();
  const { data, radar, igProgress, controlScores, loading, error } = useDashboard();

  const benchmark = settings.industry ? BENCHMARKS[settings.industry as keyof typeof BENCHMARKS] : null;
  const benchmarkGroup = benchmark ? getGroupScores(benchmark) : null;
  const benchmarkIG = benchmark ? getIGScores(benchmark) : null;
  const benchmarkSpider = benchmark ? getSpiderData(benchmark) : null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <Spinner className="text-accent" />
          <span className="text-sm text-muted">{t("dashboard.loading")}</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Layout title={t("dashboard.title")} subtitle={t("dashboard.subtitle")}>
        <p className="text-center text-muted py-8">{t("dashboard.failed")}</p>
      </Layout>
    );
  }

  const s = data.summary;
  const riskData = Object.entries(s.by_risk)
    .map(([key, value]) => ({ name: t(`risk.${key}`) || key.charAt(0).toUpperCase() + key.slice(1), value, key }))
    .filter((d) => d.value > 0);

  const radarData = radar || [];
  const spiderData = controlScores
    ? controlScores.map((c) => ({ cis_id: c.cis_id, current: c.score, target: 100 }))
    : [];

  return (
    <Layout title={t("dashboard.title")} subtitle={t("dashboard.subtitle")}>
      <div className="space-y-8">
        <ComplianceSummaryCard
          score={s.compliance_score}
          total={s.total}
          implemented={s.implemented}
          inProgress={s.in_progress}
          notImplemented={s.not_implemented}
          needsReview={s.needs_review}
          spiderData={spiderData}
          benchmarkScore={benchmark?.total}
          benchmarkSpiderData={benchmarkSpider || undefined}
        />

        {/* 18 Control badges grid */}
        {controlScores && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("dashboard.cis_controls_overview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2">
                {controlScores.map((c) => {
                  const color =
                    c.status === "implemented"
                      ? "bg-success-dim text-success border-success-border hover:bg-success/25"
                      : c.status === "in_progress"
                      ? "bg-info-dim text-info border-info-border hover:bg-info/25"
                      : c.status === "needs_review"
                      ? "bg-warning-dim text-warning border-warning-border hover:bg-warning/25"
                      : "bg-danger-dim text-danger border-danger-border hover:bg-danger/25";
                  const localizedName = localizeControlName(c.cis_id, c.name, lang);
                  return (
                    <a
                      key={c.id}
                      href={`/controls/${c.id}`}
                      className={`flex items-center justify-center rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${color}`}
                      title={`${localizedName} (${c.score}%)`}
                    >
                      CIS {c.cis_id}
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Three analysis cards side by side — Group, IG, Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-muted" />
                {t("dashboard.group_maturity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={groupChartConfig} className="aspect-square h-72">
                <RadarChart data={radarData.map((d) => ({ ...d, benchmark: benchmarkGroup?.[d.group as keyof typeof benchmarkGroup] ?? 0 }))}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="group" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
                  <Radar
                    name={t("dashboard.you")}
                    dataKey="score"
                    stroke="var(--color-score)"
                    fill="var(--color-score)"
                    fillOpacity={0.1}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "var(--color-background)", stroke: "var(--color-score)", strokeWidth: 2 }}
                  />
                  {benchmark && benchmarkGroup && (
                    <Radar
                      name={benchmark.name}
                      dataKey="benchmark"
                      stroke="var(--color-muted-foreground)"
                      fill="var(--color-muted-foreground)"
                      fillOpacity={0.05}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  )}
                  <ShadTooltip content={<ChartTooltipContent />} />
                </RadarChart>
              </ChartContainer>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
                {radarData.map((g) => (
                  <div key={g.group} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: RADAR_COLORS[g.group] || "var(--color-muted)" }}
                    />
                    <span>{t(`group.${g.group.toLowerCase()}`)}</span>
                    <span className="font-semibold text-foreground">{g.score}%</span>
                    {benchmarkGroup && (
                      <span className="text-muted">/ {benchmarkGroup[g.group as keyof typeof benchmarkGroup]}%</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {igProgress && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted" />
                  {t("dashboard.ig_maturity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={igChartConfig} className="aspect-square h-72">
                  <RadarChart
                    data={[
                      { group: "IG1", score: igProgress.ig1?.score ?? 0, benchmark: benchmarkIG?.IG1 ?? 0 },
                      { group: "IG2", score: igProgress.ig2?.score ?? 0, benchmark: benchmarkIG?.IG2 ?? 0 },
                      { group: "IG3", score: igProgress.ig3?.score ?? 0, benchmark: benchmarkIG?.IG3 ?? 0 },
                    ]}
                  >
                    <PolarGrid stroke="var(--color-border)" />
                    <PolarAngleAxis dataKey="group" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
                    <Radar
                      name={t("dashboard.you")}
                      dataKey="score"
                      stroke="var(--color-score)"
                      fill="var(--color-score)"
                      fillOpacity={0.1}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "var(--color-background)", stroke: "var(--color-score)", strokeWidth: 2 }}
                    />
                    {benchmark && benchmarkIG && (
                      <Radar
                        name={benchmark.name}
                        dataKey="benchmark"
                        stroke="var(--color-muted-foreground)"
                        fill="var(--color-muted-foreground)"
                        fillOpacity={0.05}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    )}
                    <ShadTooltip content={<ChartTooltipContent />} />
                  </RadarChart>
                </ChartContainer>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
                  {["IG1", "IG2", "IG3"].map((ig) => {
                    const p = igProgress[ig.toLowerCase() as keyof typeof igProgress];
                    if (!p) return null;
                    return (
                      <div key={ig} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: IG_RADAR_COLORS[ig] || "var(--color-muted)" }}
                        />
                        <span>{ig}</span>
                        <span className="font-semibold text-foreground">{p.score}%</span>
                        {benchmarkIG && (
                          <span className="text-muted">/ {benchmarkIG[ig as keyof typeof benchmarkIG]}%</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <StatusBarChart
            implemented={s.implemented}
            inProgress={s.in_progress}
            notImplemented={s.not_implemented}
            needsReview={s.needs_review}
          />
        </div>

        {/* Risk Distribution — visual cards instead of generic bars */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.risk_distribution")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {s.not_implemented === s.total && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-dim px-3 py-2 text-xs text-warning">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{t("dashboard.risk_seed_warning")}</span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {riskData.map((entry) => {
                const pct = s.total > 0 ? Math.round((entry.value / s.total) * 100) : 0;
                return (
                  <div
                    key={entry.key}
                    className="rounded-lg border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: RISK_COLORS[entry.key] }}
                      />
                      <span className="text-xs font-medium text-muted capitalize">{t(`risk.${entry.key}`)}</span>
                    </div>
                    <div className="text-2xl font-bold">{entry.value}</div>
                    <div className="space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/20">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: RISK_COLORS[entry.key],
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-muted font-medium">{t("dashboard.metric.pct_of_total", { pct })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted" />
                {t("dashboard.upcoming_reviews")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.upcoming_reviews}</div>
              <p className="text-sm text-muted mt-1">{t("dashboard.upcoming_reviews_desc")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted" />
                {t("dashboard.recent_activity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recent_activity.map((ctrl) => (
                  <div key={ctrl.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <div className="text-sm font-medium">{localizeControlName(ctrl.cis_id, ctrl.name, lang)}</div>
                      <div className="text-xs text-muted">{t("dashboard.updated_ago", { date: formatDateShort(ctrl.updated_at) })}</div>
                    </div>
                    <ControlStatusBadge status={ctrl.status} />
                  </div>
                ))}
                {data.recent_activity.length === 0 && (
                  <p className="text-sm text-muted">{t("dashboard.no_recent_activity")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
