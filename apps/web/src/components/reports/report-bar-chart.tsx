"use client";

import { cn } from "@/lib/utils";

type ReportBarChartDatum = {
  label: string;
  value: number;
  secondaryValue?: string;
};

type ReportBarChartProps = Readonly<{
  data: ReportBarChartDatum[];
  valueFormatter?: (value: number) => string;
  barClassName?: string;
  className?: string;
}>;

export function ReportBarChart(props: ReportBarChartProps) {
  const {
    data,
    valueFormatter = (value) => value.toLocaleString(),
    barClassName,
    className,
  } = props;

  const maxValue = Math.max(...data.map((item) => item.value), 0, 1);

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="flex h-64 items-end gap-3">
        {data.map((item) => {
          const height = Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 2);

          return (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                {valueFormatter(item.value)}
              </span>
              <div className="flex h-48 w-full items-end rounded-xl bg-muted/40 px-1 py-1">
                <div
                  className={cn(
                    "w-full rounded-lg bg-primary transition-all",
                    barClassName,
                  )}
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                {item.secondaryValue ? (
                  <p className="text-[11px] text-muted-foreground">{item.secondaryValue}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
