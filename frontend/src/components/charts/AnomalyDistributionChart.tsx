"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { AnomalyDistItem } from "@/lib/types";
import { SEVERITY_BAR_COLORS, CHART_COLORS } from "@/lib/constants";

const MOCK: AnomalyDistItem[] = [
  { severity: "low", count: 5 },
  { severity: "medium", count: 4 },
  { severity: "high", count: 2 },
  { severity: "critical", count: 1 },
];

interface Props {
  data?: AnomalyDistItem[];
}

export default function AnomalyDistributionChart({ data = MOCK }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          dataKey="count"
          nameKey="severity"
          paddingAngle={3}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={SEVERITY_BAR_COLORS[entry.severity]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: CHART_COLORS.tooltip.bg,
            border: `1px solid ${CHART_COLORS.tooltip.border}`,
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
          formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
