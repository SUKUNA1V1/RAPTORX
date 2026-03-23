"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import DecisionBadge from "@/components/ui/DecisionBadge";
import RiskBar from "@/components/ui/RiskBar";
import ApiStatus from "@/components/ui/ApiStatus";
import AccessTimelineChart from "@/components/charts/AccessTimelineChart";
import AnomalyDistributionChart from "@/components/charts/AnomalyDistributionChart";
import MagicBento from "@/components/MagicBento";
import { clearAccessLogs, getApiErrorMessage, getOverview, getTimeline, getAnomalyDist, getLogs, getTopAccessPoints } from "@/lib/api";
import { MOCK_OVERVIEW, MOCK_LOGS } from "@/lib/constants";
import type { StatsOverview, AccessLog, TimelinePoint, AnomalyDistItem, TopAccessPoint } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<StatsOverview>(MOCK_OVERVIEW);
  const [logs, setLogs] = useState<AccessLog[]>(MOCK_LOGS as AccessLog[]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [anomaly, setAnomaly] = useState<AnomalyDistItem[]>([]);
  const [topPoints, setTopPoints] = useState<TopAccessPoint[]>([]);
  const [apiOnline, setApiOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async (background = false) => {
    try {
      if (!background) {
        setLoading(true);
      }
      setError(null);
      const [ov, tl, an, lg, tp] = await Promise.allSettled([
        getOverview(),
        getTimeline(),
        getAnomalyDist(),
        getLogs({ limit: 10 }),
        getTopAccessPoints(),
      ]);

      if (ov.status === "fulfilled" && ov.value) setOverview(ov.value);

      if (tl.status === "fulfilled" && tl.value?.length) setTimeline(tl.value);

      if (an.status === "fulfilled" && an.value?.length) setAnomaly(an.value);

      if (lg.status === "fulfilled" && lg.value?.items?.length) {
        setLogs(lg.value.items);
      } else if (lg.status === "fulfilled") {
        setLogs(MOCK_LOGS as AccessLog[]);
      }

      if (tp.status === "fulfilled" && tp.value?.length) setTopPoints(tp.value);

      const allFailed = [ov, tl, an, lg, tp].every((r) => r.status === "rejected");
      if (allFailed) setError("Cannot connect to server - showing demo data");
      setApiOnline(!allFailed);
    } catch {
      setApiOnline(false);
      setError("Cannot connect to server - showing demo data");
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleClearLogs = useCallback(async () => {
    if (clearing) {
      return;
    }
    if (!window.confirm("Clear all access logs and alerts? This cannot be undone.")) {
      return;
    }
    try {
      setClearing(true);
      setError(null);
      await clearAccessLogs();
      setLogs([]);
      fetchAll(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to clear access logs"));
    } finally {
      setClearing(false);
    }
  }, [clearing]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchAll(true);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const data = await getLogs({ limit: 10 });
        if (data.items?.length) setLogs(data.items);
      } catch {
      }
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const bentoCards = useMemo(() => {
    const topPoint = topPoints[0];
    const latestLog = logs[0];
    const latestUser = latestLog?.user
      ? `${latestLog.user.first_name} ${latestLog.user.last_name}`
      : latestLog?.badge_id_used ?? "No recent access";
    const latestPoint = latestLog?.access_point?.name ?? "Unknown point";
    const latestTime = latestLog
      ? new Date(latestLog.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";
    const totalToday = Math.max(overview.total_accesses_today, 1);
    const anomalyRate = `${((overview.active_alerts_count / totalToday) * 100).toFixed(1)}%`;
    const anomalyTotal = anomaly.reduce((sum, item) => sum + item.count, 0);
    const topAnomaly = [...anomaly].sort((first, second) => second.count - first.count)[0];
    const topAnomalyPct = topAnomaly && anomalyTotal > 0 ? `${((topAnomaly.count / anomalyTotal) * 100).toFixed(1)}%` : "0.0%";

    return [
      {
        label: "Accesses",
        title: "Total Today",
        description: `Total Today: ${overview.total_accesses_today} | Granted: ${overview.granted_today} | Denied: ${overview.denied_today} | Delayed: ${overview.delayed_today} | Open Alerts: ${overview.active_alerts_count}`,
        value: overview.total_accesses_today.toLocaleString(),
      },
      {
        label: "Grants",
        title: "Approved Entries",
        description: "Requests allowed by policy engine",
        value: overview.granted_today.toLocaleString(),
      },
      {
        label: "Live Feed",
        title: latestUser,
        description: `${latestPoint} at ${latestTime}`,
        value: clearing ? "Clearing..." : "Click to clear",
        onClick: handleClearLogs,
        content:
          logs.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-4 w-full">No access logs yet today</p>
          ) : (
            <div className="w-full h-full flex flex-col justify-between gap-1.5">
              {logs.slice(0, 10).map((log, index) => (
                <div
                  key={log.id ?? index}
                  className="flex items-center gap-2 px-2.5 py-2 bg-slate-700/40 rounded-md"
                >
                  <span className="text-slate-400 text-xs font-mono w-14 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-slate-200 text-sm flex-1 truncate">
                    {log.user ? `${log.user.first_name} ${log.user.last_name}` : log.badge_id_used ?? "-"}
                  </span>
                  <span className="text-slate-400 text-xs flex-1 truncate hidden xl:block">
                    {log.access_point?.name ?? "-"}
                  </span>
                  <div className="scale-90 origin-center">
                    <DecisionBadge decision={log.decision} />
                  </div>
                  <div className="w-10 flex-shrink-0">
                    <RiskBar score={log.risk_score} />
                  </div>
                </div>
              ))}
            </div>
          ),
      },
      {
        label: "Anomaly",
        title: "Distribution",
        description: topAnomaly ? `${topAnomaly.category} is the most frequent class` : "No anomaly buckets available",
        value: topAnomalyPct,
        content: (
          <div className="h-[190px] w-full flex items-center justify-center">
            <AnomalyDistributionChart
              data={anomaly.length ? anomaly : undefined}
              height={190}
              innerRadius={46}
              outerRadius={70}
              showLegend={false}
            />
          </div>
        ),
      },
      {
        label: "Top Point",
        title: topPoint?.name ?? "No Access Point Data",
        description: "Most used entry location today",
        value: topPoint ? `${topPoint.count} hits` : "0 hits",
        onClick: () => router.push("/top-points"),
      },
      {
        label: "Latest",
        title: latestUser,
        description: `Most recent access event at ${latestTime}`,
        value: anomalyRate,
      },
    ];
  }, [overview, topPoints, logs, anomaly, router, handleClearLogs, clearing]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Security operations snapshot for today</p>
        </div>
        {!apiOnline && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-400 text-xs font-medium">Demo Mode - Backend Offline</span>
          </div>
        )}
      </div>

      {(loading || error) && <ApiStatus loading={loading} error={error} onRetry={fetchAll} />}

      <MagicBento
        cards={bentoCards}
        textAutoHide={true}
        enableStars
        enableSpotlight
        enableBorderGlow={true}
        enableTilt={false}
        enableMagnetism={false}
        clickEffect
        spotlightRadius={400}
        particleCount={12}
        glowColor="148, 163, 184"
        disableAnimations={false}
      />

      {!loading && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Access Activity - Last 24 Hours</h2>
          <AccessTimelineChart data={timeline.length ? timeline : undefined} />
        </div>
      )}

    </div>
  );
}
