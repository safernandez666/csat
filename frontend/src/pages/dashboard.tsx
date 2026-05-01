import { useDashboard } from "../hooks/use-api";
import { Layout } from "../components/layout";
import { ComplianceSummaryCard } from "../components/compliance-summary-card";
import { StatusBarChart } from "../components/status-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ControlStatusBadge } from "../components/control-status-badge";

import { formatDateShort } from "../lib/utils";
import {
  XAxis, YAxis, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip as ShadTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "../components/ui/chart";
import { Calendar, Activity, Target, AlertCircle } from "lucide-react";
import { Spinner } from "../components/ui/spinner";

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

const controlChartConfig = {
  current: { label: "Current", color: "var(--color-info)" },
  target: { label: "Target", color: "var(--color-border)" },
};



/* Mock historical data for area chart */
const areaData = [
  { month: "Jan", implemented: 2, in_progress: 3, not_implemented: 13 },
  { month: "Feb", implemented: 3, in_progress: 4, not_implemented: 11 },
  { month: "Mar", implemented: 5, in_progress: 3, not_implemented: 10 },
  { month: "Apr", implemented: 6, in_progress: 4, not_implemented: 8 },
  { month: "May", implemented: 8, in_progress: 3, not_implemented: 7 },
  { month: "Jun", implemented: 10, in_progress: 2, not_implemented: 6 },
];

const areaConfig = {
  implemented: { label: "Implemented", color: "var(--color-success)" },
  in_progress: { label: "In Progress", color: "var(--color-info)" },
  not_implemented: { label: "Not Implemented", color: "var(--color-danger)" },
};

export default function DashboardPage() {
  const { data, radar, igProgress, controlScores, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <Spinner className="text-accent" />
          <span className="text-sm text-muted">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Layout title="Dashboard" subtitle="Overview">
        <p className="text-center text-muted py-8">Failed to load dashboard.</p>
      </Layout>
    );
  }

  const s = data.summary;
  const riskData = Object.entries(s.by_risk)
    .map(([key, value]) => ({ name: key.charAt(0).toUpperCase() + key.slice(1), value, key }))
    .filter((d) => d.value > 0);

  const radarData = radar || [];
  const spiderData = controlScores
    ? controlScores.map((c) => ({ cis_id: c.cis_id, current: c.score, target: 100 }))
    : [];

  return (
    <Layout title="Dashboard" subtitle="Compliance overview and activity">
      <div className="space-y-8">
        <ComplianceSummaryCard
          score={s.compliance_score}
          total={s.total}
          implemented={s.implemented}
          inProgress={s.in_progress}
          notImplemented={s.not_implemented}
          needsReview={s.needs_review}
        />

        {/* 18 Control badges grid */}
        {controlScores && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CIS Controls Overview</CardTitle>
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
                  return (
                    <a
                      key={c.id}
                      href={`/controls/${c.id}`}
                      className={`flex items-center justify-center rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${color}`}
                      title={`${c.name} (${c.score}%)`}
                    >
                      CIS {c.cis_id}
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Three radars side by side — shadcn ChartContainer style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-muted" />
                Control Group Maturity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={groupChartConfig} className="aspect-square h-72">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="group" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
                  <Radar
                    name="Implementation %"
                    dataKey="score"
                    stroke="var(--color-score)"
                    fill="var(--color-score)"
                    fillOpacity={0.1}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "var(--color-background)", stroke: "var(--color-score)", strokeWidth: 2 }}
                  />
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
                    <span>{g.group}</span>
                    <span className="font-semibold text-foreground">{g.score}%</span>
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
                  Implementation Group Maturity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={igChartConfig} className="aspect-square h-72">
                  <RadarChart
                    data={[
                      { group: "IG1", score: igProgress.ig1?.score ?? 0 },
                      { group: "IG2", score: igProgress.ig2?.score ?? 0 },
                      { group: "IG3", score: igProgress.ig3?.score ?? 0 },
                    ]}
                  >
                    <PolarGrid stroke="var(--color-border)" />
                    <PolarAngleAxis dataKey="group" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
                    <Radar
                      name="Implementation %"
                      dataKey="score"
                      stroke="var(--color-score)"
                      fill="var(--color-score)"
                      fillOpacity={0.1}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "var(--color-background)", stroke: "var(--color-score)", strokeWidth: 2 }}
                    />
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
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {controlScores && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted" />
                  Spider Web — 18 Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={controlChartConfig} className="aspect-square h-72">
                  <RadarChart data={spiderData}>
                    <PolarGrid stroke="var(--color-border)" />
                    <PolarAngleAxis dataKey="cis_id" tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 9 }} />
                    <Radar
                      name="Target"
                      dataKey="target"
                      stroke="var(--color-border)"
                      fill="var(--color-border)"
                      fillOpacity={0.05}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Radar
                      name="Current"
                      dataKey="current"
                      stroke="var(--color-current)"
                      fill="var(--color-current)"
                      fillOpacity={0.15}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "var(--color-background)", stroke: "var(--color-current)", strokeWidth: 2 }}
                    />
                    <ShadTooltip content={<ChartTooltipContent />} />
                  </RadarChart>
                </ChartContainer>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
                  {["Basic", "Foundational", "Organizational"].map((g) => (
                    <div key={g} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: RADAR_COLORS[g] || "var(--color-muted)" }}
                      />
                      <span>{g}</span>
                    </div>
                  ))}
                  <span className="text-[10px]">(tooltip shows control name)</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Donut Active + Area Chart Gradient */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatusBarChart
            implemented={s.implemented}
            inProgress={s.in_progress}
            notImplemented={s.not_implemented}
            needsReview={s.needs_review}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compliance Trend (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={areaConfig} className="aspect-video h-64">
                <AreaChart data={areaData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <ShadTooltip content={<ChartTooltipContent />} />
                  <defs>
                    <linearGradient id="fillImplemented" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-implemented)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-implemented)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fillInProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-in_progress)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-in_progress)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="implemented"
                    stroke="var(--color-implemented)"
                    fill="url(#fillImplemented)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="in_progress"
                    stroke="var(--color-in_progress)"
                    fill="url(#fillInProgress)"
                    strokeWidth={2}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Risk Distribution — visual cards instead of generic bars */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {s.not_implemented === s.total && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-dim px-3 py-2 text-xs text-warning">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>These risk levels are default seed values. Update controls to reflect your actual risk assessment.</span>
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
                      <span className="text-xs font-medium text-muted capitalize">{entry.key}</span>
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
                      <div className="text-[10px] text-muted font-medium">{pct}% of total</div>
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
                Upcoming Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.upcoming_reviews}</div>
              <p className="text-sm text-muted mt-1">Controls requiring review in the next 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recent_activity.map((ctrl) => (
                  <div key={ctrl.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <div className="text-sm font-medium">{ctrl.name}</div>
                      <div className="text-xs text-muted">Updated {formatDateShort(ctrl.updated_at)}</div>
                    </div>
                    <ControlStatusBadge status={ctrl.status} />
                  </div>
                ))}
                {data.recent_activity.length === 0 && (
                  <p className="text-sm text-muted">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
