import { ShieldCheck, AlertTriangle, Clock, CheckCircle2, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { NumberTicker } from "./ui/number-ticker";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./ui/chart";
import { PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis } from "recharts";
import type { BarShapeProps } from "recharts/types/cartesian/Bar";
import { useTranslation } from "../hooks/use-translation";

interface ComplianceSummaryCardProps {
  score: number;
  total: number;
  implemented: number;
  inProgress: number;
  notImplemented: number;
  needsReview: number;
}

const radialConfig = {
  score: { label: "Score", color: "var(--color-info)" },
} satisfies ChartConfig;

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
}: ComplianceSummaryCardProps) {
  const { t } = useTranslation();
  const gaugeColor = score >= 80 ? "var(--color-success)" : score >= 60 ? "var(--color-warning)" : "var(--color-danger)";
  const radialData = [{ score, fill: gaugeColor }];
  const pctText = (n: number) =>
    t("dashboard.metric.pct_of_total", { pct: total > 0 ? Math.round((n / total) * 100) : 0 });

  const chartData = [
    { status: "implemented", value: implemented, fill: "var(--color-success)" },
    { status: "in_progress", value: inProgress, fill: "var(--color-info)" },
    { status: "not_implemented", value: notImplemented, fill: "var(--color-danger)" },
    { status: "needs_review", value: needsReview, fill: "var(--color-warning)" },
  ];

  const barChartConfig = {
    value: { label: t("nav.controls") },
    implemented: { label: t("status.implemented.long"), color: "var(--color-success)" },
    in_progress: { label: t("status.in_progress.long"), color: "var(--color-info)" },
    not_implemented: { label: t("status.not_implemented.long"), color: "var(--color-danger)" },
    needs_review: { label: t("status.needs_review.long"), color: "var(--color-warning)" },
  } satisfies ChartConfig;

  const maxIndex = chartData.reduce(
    (maxIdx, item, idx) => (item.value > chartData[maxIdx].value ? idx : maxIdx),
    0
  );

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
        <CardContent>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
            <ChartContainer config={radialConfig} className="mx-auto h-36 w-36 shrink-0">
              <RadialBarChart
                data={radialData}
                endAngle={100}
                innerRadius={45}
                outerRadius={65}
              >
                <PolarGrid
                  gridType="circle"
                  radialLines={false}
                  stroke="none"
                  className="first:fill-muted last:fill-background"
                  polarRadius={[60, 52]}
                />
                <RadialBar dataKey="score" background cornerRadius={4} fill={gaugeColor} />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground"
                    style={{ fontSize: 18, fontWeight: 700 }}
                  >
                    {score}%
                  </text>
                </PolarRadiusAxis>
              </RadialBarChart>
            </ChartContainer>
            <div className="text-center sm:text-left">
              <div className="text-sm font-semibold">{t("dashboard.current_assessment")}</div>
              <p className="text-xs text-muted mt-1 max-w-md">{t("dashboard.current_assessment_desc")}</p>
            </div>
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

      {/* Status Breakdown bar chart — integrated under Compliance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.status_breakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barChartConfig} className="aspect-video h-64">
            <BarChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="status"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) =>
                  (barChartConfig[value as keyof typeof barChartConfig] as any)?.label || value
                }
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar
                dataKey="value"
                strokeWidth={2}
                radius={8}
                shape={({ index, ...props }: BarShapeProps) =>
                  index === maxIndex ? (
                    <Rectangle
                      {...props}
                      fillOpacity={0.8}
                      stroke={props.payload.fill}
                      strokeDasharray={4}
                      strokeDashoffset={4}
                    />
                  ) : (
                    <Rectangle {...props} />
                  )
                }
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
