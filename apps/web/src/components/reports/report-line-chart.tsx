"use client";

import { cn } from "@/lib/utils";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReportLineChartDatum = {
  label: string;
  value: number;
  secondaryValue?: string;
};

type ReportLineChartProps = Readonly<{
  data: ReportLineChartDatum[];
  valueFormatter?: (value: number) => string;
  axisValueFormatter?: (value: number) => string;
  tooltipLabel?: string;
  className?: string;
  showSummary?: boolean;
}>;

type ReportLineChartTooltipProps = Readonly<{
  active?: boolean;
  payload?: Array<{
    value?: number | string;
    payload: ReportLineChartDatum;
  }>;
  label?: string;
  tooltipLabel: string;
  valueFormatter: (value: number) => string;
}>;

function ReportLineChartTooltip(props: ReportLineChartTooltipProps) {
  const { active, payload, label, tooltipLabel, valueFormatter } = props;

  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const numericValue = typeof item.value === "number" ? item.value : Number(item.value ?? 0);

  return (
    <div className="min-w-44 rounded-xl border border-border/70 bg-background/95 p-3 shadow-xl backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{tooltipLabel}</span>
        <span className="text-sm font-semibold text-foreground">
          {valueFormatter(numericValue)}
        </span>
      </div>
      {item.payload.secondaryValue ? (
        <p className="mt-2 text-xs text-muted-foreground">{item.payload.secondaryValue}</p>
      ) : null}
    </div>
  );
}

export function ReportLineChart(props: ReportLineChartProps) {
  const {
    data,
    valueFormatter = (value) => value.toLocaleString(),
    axisValueFormatter = valueFormatter,
    className,
    tooltipLabel = "Value",
    showSummary = true,
  } = props;

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="h-72 w-full overflow-hidden rounded-xl border border-border/50 bg-muted/10 p-3 sm:p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              minTickGap={18}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(value: number) => axisValueFormatter(value)}
            />
            <Tooltip
              cursor={{ stroke: "rgba(148, 163, 184, 0.35)", strokeDasharray: "4 4", strokeWidth: 1 }}
              wrapperStyle={{ outline: "none" }}
              content={
                <ReportLineChartTooltip
                  tooltipLabel={tooltipLabel}
                  valueFormatter={valueFormatter}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {showSummary ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {data.map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium text-foreground">{item.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{valueFormatter(item.value)}</p>
              {item.secondaryValue ? (
                <p className="mt-1 text-xs text-muted-foreground">{item.secondaryValue}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
