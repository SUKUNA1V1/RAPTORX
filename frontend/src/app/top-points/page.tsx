"use client";

import { useEffect, useState } from "react";
import TopAccessPointsChart from "@/components/charts/TopAccessPointsChart";
import ApiStatus from "@/components/ui/ApiStatus";
import { getTopAccessPoints } from "@/lib/api";
import type { TopAccessPoint } from "@/lib/types";

export default function TopPointsPage() {
  const [topPoints, setTopPoints] = useState<TopAccessPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTopAccessPoints();
      setTopPoints(data ?? []);
    } catch {
      setError("Cannot connect to server - showing demo data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopPoints();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Top Access Points Today</h1>
        <p className="text-slate-400 text-sm mt-1">Most active entry locations by request volume</p>
      </div>

      {(loading || error) && <ApiStatus loading={loading} error={error} onRetry={fetchTopPoints} />}

      {!loading && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <TopAccessPointsChart data={topPoints.length ? topPoints : undefined} />
        </div>
      )}
    </div>
  );
}
