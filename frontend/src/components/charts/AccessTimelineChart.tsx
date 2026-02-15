"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TimelinePoint } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";

const MOCK: TimelinePoint[] = Array.from({ length: 24 }, (_, h) => {
  const peak = h >= 8 && h <= 18;
  return {
    hour: h,
    granted: peak ? 12 + (h % 6) * 2 : 1 + (h % 3),
    denied: peak ? 1 + (h % 3) : h % 2,
    delayed: peak ? (h % 2) : 0,
  };
});

interface Props {
  data?: TimelinePoint[];
}

export default function AccessTimelineChart({ data = MOCK }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="hour"
          stroke={CHART_COLORS.text}
          tick={{ fontSize: 11, fill: CHART_COLORS.text }}
          tickFormatter={(h) => `${h}:00`}
          interval={3}
        />
        <YAxis stroke={CHART_COLORS.text} tick={{ fontSize: 11, fill: CHART_COLORS.text }} />
        <Tooltip
          contentStyle={{
            backgroundColor: CHART_COLORS.tooltip.bg,
            border: `1px solid ${CHART_COLORS.tooltip.border}`,
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
          labelFormatter={(h) => `Hour: ${h}:00`}
        />
        <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
        <Line type="monotone" dataKey="granted" stroke={CHART_COLORS.granted} strokeWidth={2} dot={false} name="Granted" />
        <Line type="monotone" dataKey="denied" stroke={CHART_COLORS.denied} strokeWidth={2} dot={false} name="Denied" />
        <Line type="monotone" dataKey="delayed" stroke={CHART_COLORS.delayed} strokeWidth={2} dot={false} name="Delayed" />
      </LineChart>
    </ResponsiveContainer>
  );
}
