import { useCallback, useEffect, useState } from "react";
import { getOverview, getTimeline, getTopAccessPoints } from "@/lib/api";
import type { StatsOverview, TimelinePoint, TopAccessPoint } from "@/lib/types";

export function useStats() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [topAccessPoints, setTopAccessPoints] = useState<TopAccessPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [overviewData, timelineData, topPoints] = await Promise.all([
        getOverview(),
        getTimeline(),
        getTopAccessPoints(),
      ]);
      setOverview(overviewData);
      setTimeline(timelineData);
      setTopAccessPoints(topPoints);
      setError(null);
    } catch (err) {
      setError("Unable to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { overview, timeline, topAccessPoints, loading, error, reload: load };
}
