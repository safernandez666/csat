import { ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { NumberTicker } from "./ui/number-ticker";
import { ChartContainer, type ChartConfig } from "./ui/chart";
import { PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

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

export function ComplianceSummaryCard({
  score,
  implemented,
  inProgress,
  notImplemented,
  needsReview,
}: ComplianceSummaryCardProps) {
  const gaugeColor = score >= 80 ? "var(--color-success)" : score >= 60 ? "var(--color-warning)" : "var(--color-danger)";
  const radialData = [{ score, fill: gaugeColor }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          Compliance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Radial Bar Chart — Current Assessment */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ChartContainer config={radialConfig} className="mx-auto h-36 w-36">
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
            <span className="text-xs text-muted">Current assessment</span>
          </div>

          {/* KPI grid with NumberTicker */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 w-full">
            <div className="rounded-lg border border-success-border bg-success-dim p-3">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-semibold">Implemented</span>
              </div>
              <div className="mt-1 text-xl font-bold">
                <NumberTicker value={implemented} />
              </div>
            </div>
            <div className="rounded-lg border border-info-border bg-info-dim p-3">
              <div className="flex items-center gap-2 text-info">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-semibold">In Progress</span>
              </div>
              <div className="mt-1 text-xl font-bold">
                <NumberTicker value={inProgress} />
              </div>
            </div>
            <div className="rounded-lg border border-danger-border bg-danger-dim p-3">
              <div className="flex items-center gap-2 text-danger">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-semibold">Not Implemented</span>
              </div>
              <div className="mt-1 text-xl font-bold">
                <NumberTicker value={notImplemented} />
              </div>
            </div>
            <div className="rounded-lg border border-warning-border bg-warning-dim p-3">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-semibold">Needs Review</span>
              </div>
              <div className="mt-1 text-xl font-bold">
                <NumberTicker value={needsReview} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
