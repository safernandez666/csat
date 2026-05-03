import { ShieldCheck, AlertTriangle, Clock, CheckCircle2, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { NumberTicker } from "./ui/number-ticker";
import { ChartContainer, type ChartConfig } from "./ui/chart";
import { PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
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
    </div>
  );
}
