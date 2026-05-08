import { ShieldCheck, AlertTriangle, Clock, CheckCircle2, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { NumberTicker } from "./ui/number-ticker";
import { ChartContainer, type ChartConfig } from "./ui/chart";
import { PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import {
  RadarChart, Radar, PolarAngleAxis,
} from "recharts";
import { useTranslation } from "../hooks/use-translation";

interface ComplianceSummaryCardProps {
  score: number;
  total: number;
  implemented: number;
  inProgress: number;
  notImplemented: number;
  needsReview: number;
  spiderData?: { cis_id: string; current: number; target: number }[];
  benchmarkScore?: number;
  benchmarkSpiderData?: { cis_id: string; current: number; target: number }[];
}

const radialConfig = {
  score: { label: "Score", color: "var(--color-info)" },
} satisfies ChartConfig;

const controlChartConfig = {
  current: { label: "Current", color: "var(--color-info)" },
  target: { label: "Target", color: "var(--color-border)" },
} satisfies ChartConfig;

const RADAR_COLORS: Record<string, string> = {
  Basic: "var(--color-success)",
  Foundational: "var(--color-info)",
  Organizational: "var(--color-purple)",
};

interface MetricCardProps {
  label: string;
  value: number;
  description: string;
  pctText: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "info" | "danger" | "warning";
}

const TONE_STYLES: Record<MetricCardProps["tone"], { icon: string; ring: string }> = {
  success: { icon: "text-success", ring: "bg-success-dim" },
  info: { icon: "text-info", ring: "bg-info-dim" },
  danger: { icon: "text-danger", ring: "bg-danger-dim" },
  warning: { icon: "text-warning", ring: "bg-warning-dim" },
};

function MetricCard({ label, value, description, pctText, icon: Icon, tone }: MetricCardProps) {
  const styles = TONE_STYLES[tone];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted">{label}</CardTitle>
        <div className={`flex size-8 items-center justify-center rounded-md ${styles.ring}`}>
          <Icon className={`size-4 ${styles.icon}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">
          <NumberTicker value={value} />
        </div>
        <CardDescription className="mt-1 text-xs">
          {pctText} · {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

export function ComplianceSummaryCard({
  score,
  total,
  implemented,
  inProgress,
  notImplemented,
  needsReview,
  spiderData,
  benchmarkScore,
  benchmarkSpiderData,
}: ComplianceSummaryCardProps) {
  const { t } = useTranslation();
  const gaugeColor = score >= 80 ? "var(--color-success)" : score >= 60 ? "var(--color-warning)" : "var(--color-danger)";
  const radialData = [{ score, fill: gaugeColor }];
  const pctText = (n: number) =>
    t("dashboard.metric.pct_of_total", { pct: total > 0 ? Math.round((n / total) * 100) : 0 });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            {t("dashboard.compliance_overview")}
          </CardTitle>
          <CardDescription>{t("dashboard.compliance_overview_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Top row: gauge + spider web */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center gap-3">
              <ChartContainer config={radialConfig} className="mx-auto h-64 w-64 shrink-0">
                <RadialBarChart
                  data={radialData}
                  endAngle={100}
                  innerRadius={70}
                  outerRadius={100}
                >
                  <PolarGrid
                    gridType="circle"
                    radialLines={false}
                    stroke="none"
                    className="first:fill-muted last:fill-background"
                    polarRadius={[92, 80]}
                  />
                  <RadialBar dataKey="score" background cornerRadius={4} fill={gaugeColor} />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground"
                      style={{ fontSize: 28, fontWeight: 700 }}
                    >
                      {score}%
                    </text>
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
              <div className="text-center">
                <div className="text-sm font-semibold">{t("dashboard.current_assessment")}</div>
                <p className="text-xs text-muted mt-1 max-w-md">{t("dashboard.current_assessment_desc")}</p>
                {benchmarkScore !== undefined && (
                  <p className="text-xs text-muted mt-1">
                    {t("dashboard.industry_avg")}: <span className="font-medium text-foreground">{benchmarkScore}%</span>
                  </p>
                )}
              </div>
            </div>

            {spiderData && spiderData.length > 0 && (
              <div>
                <div className="text-center text-sm font-medium mb-2">{t("dashboard.spider_18")}</div>
                <ChartContainer config={controlChartConfig} className="aspect-square h-64 mx-auto">
                  <RadarChart data={spiderData.map((d, i) => ({ ...d, benchmark: benchmarkSpiderData?.[i]?.current ?? 0 }))}>
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
                      name={t("dashboard.you")}
                      dataKey="current"
                      stroke="var(--color-current)"
                      fill="var(--color-current)"
                      fillOpacity={0.15}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "var(--color-background)", stroke: "var(--color-current)", strokeWidth: 2 }}
                    />
                    {benchmarkSpiderData && (
                      <Radar
                        name={t("dashboard.industry")}
                        dataKey="benchmark"
                        stroke="var(--color-muted-foreground)"
                        fill="var(--color-muted-foreground)"
                        fillOpacity={0.05}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    )}
                  </RadarChart>
                </ChartContainer>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
                  {["Basic", "Foundational", "Organizational"].map((g) => (
                    <div key={g} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: RADAR_COLORS[g] || "var(--color-muted)" }}
                      />
                      <span>{t(`group.${g.toLowerCase()}`)}</span>
                    </div>
                  ))}
                  <span className="text-[10px]">{t("dashboard.spider_tooltip_hint")}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("dashboard.metric.implemented.label")}
          value={implemented}
          pctText={pctText(implemented)}
          icon={CheckCircle2}
          tone="success"
          description={t("dashboard.metric.implemented.desc")}
        />
        <MetricCard
          label={t("dashboard.metric.in_progress.label")}
          value={inProgress}
          pctText={pctText(inProgress)}
          icon={Clock}
          tone="info"
          description={t("dashboard.metric.in_progress.desc")}
        />
        <MetricCard
          label={t("dashboard.metric.not_implemented.label")}
          value={notImplemented}
          pctText={pctText(notImplemented)}
          icon={AlertTriangle}
          tone="danger"
          description={t("dashboard.metric.not_implemented.desc")}
        />
        <MetricCard
          label={t("dashboard.metric.needs_review.label")}
          value={needsReview}
          pctText={pctText(needsReview)}
          icon={Eye}
          tone="warning"
          description={t("dashboard.metric.needs_review.desc")}
        />
      </div>
    </div>
  );
}
