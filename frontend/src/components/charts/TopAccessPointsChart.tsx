"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TopAccessPoint } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";

const MOCK: TopAccessPoint[] = [
  { name: "Main Entrance A", building: "Bldg A", total: 89, granted: 85, denied: 4 },
  { name: "Main Entrance B", building: "Bldg B", total: 67, granted: 65, denied: 2 },
  { name: "Engineering Office", building: "Bldg A", total: 45, granted: 42, denied: 3 },
  { name: "Parking Gate A", building: "Bldg A", total: 38, granted: 38, denied: 0 },
  { name: "HR Office B1", building: "Bldg B", total: 21, granted: 21, denied: 0 },
];

interface Props {
  data?: TopAccessPoint[];
}

export default function TopAccessPointsChart({ data = MOCK }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
        <XAxis type="number" stroke={CHART_COLORS.text} tick={{ fontSize: 11, fill: CHART_COLORS.text }} />
        <YAxis type="category" dataKey="name" stroke={CHART_COLORS.text} tick={{ fontSize: 11, fill: CHART_COLORS.text }} width={130} />
        <Tooltip
          contentStyle={{
            backgroundColor: CHART_COLORS.tooltip.bg,
            border: `1px solid ${CHART_COLORS.tooltip.border}`,
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
        />
        <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
