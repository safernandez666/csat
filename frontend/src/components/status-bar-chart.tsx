"use client";

import { Bar, BarChart, CartesianGrid, Rectangle, XAxis } from "recharts";
import type { BarShapeProps } from "recharts/types/cartesian/Bar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./ui/chart";
import { useTranslation } from "../hooks/use-translation";

interface StatusBarChartProps {
  implemented: number;
  inProgress: number;
  notImplemented: number;
  needsReview: number;
}

export function StatusBarChart({
  implemented,
  inProgress,
  notImplemented,
  needsReview,
}: StatusBarChartProps) {
  const { t } = useTranslation();
  const chartData = [
    { status: "implemented", value: implemented, fill: "var(--color-success)" },
    { status: "in_progress", value: inProgress, fill: "var(--color-info)" },
    { status: "not_implemented", value: notImplemented, fill: "var(--color-danger)" },
    { status: "needs_review", value: needsReview, fill: "var(--color-warning)" },
  ];

  const chartConfig = {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard.status_breakdown")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-video h-64">
          <BarChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="status"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                (chartConfig[value as keyof typeof chartConfig] as any)?.label || value
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
  );
}
