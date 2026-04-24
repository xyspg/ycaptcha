"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/lib/analytics";

interface AnalyticsChartProps {
  data: DailyPoint[];
  metric: "verifies" | "passes" | "fails";
  label: string;
}

const COLOR_BY_METRIC: Record<AnalyticsChartProps["metric"], string> = {
  verifies: "var(--primary)",
  passes: "rgb(34 197 94)", // green-500
  fails: "rgb(239 68 68)", // red-500
};

export function AnalyticsChart({ data, metric, label }: AnalyticsChartProps) {
  const color = COLOR_BY_METRIC[metric];
  const gradientId = `analytics-grad-${metric}`;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            strokeOpacity={0.08}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
            axisLine={false}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            cursor={{ stroke: "currentColor", strokeOpacity: 0.15 }}
            contentStyle={{
              background: "var(--popover, #fff)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 8,
              fontSize: 12,
              padding: "6px 10px",
            }}
            labelFormatter={(d) => String(d ?? "")}
            formatter={(value) => [String(value ?? 0), label]}
          />
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
