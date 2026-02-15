"use client";

import { useState, useEffect } from "react";
import { DoorOpen, CheckCircle, XCircle, Clock, AlertTriangle, Users } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import DecisionBadge from "@/components/ui/DecisionBadge";
import RiskBar from "@/components/ui/RiskBar";
import ApiStatus from "@/components/ui/ApiStatus";
import AccessTimelineChart from "@/components/charts/AccessTimelineChart";
import AnomalyDistributionChart from "@/components/charts/AnomalyDistributionChart";
import TopAccessPointsChart from "@/components/charts/TopAccessPointsChart";
import { getOverview, getTimeline, getAnomalyDist, getLogs, getTopAccessPoints } from "@/lib/api";
import { MOCK_OVERVIEW, MOCK_LOGS } from "@/lib/constants";
import type { StatsOverview, AccessLog, TimelinePoint, AnomalyDistItem, TopAccessPoint } from "@/lib/types";

export default function DashboardPage() {
  const [overview, setOverview] = useState<StatsOverview>(MOCK_OVERVIEW);
  const [logs, setLogs] = useState<AccessLog[]>(MOCK_LOGS as AccessLog[]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [anomaly, setAnomaly] = useState<AnomalyDistItem[]>([]);
  const [topPoints, setTopPoints] = useState<TopAccessPoint[]>([]);
  const [apiOnline, setApiOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const data = await getLogs({ limit: 10 });
        if (data.items?.length) setLogs(data.items);
      } catch {
        setApiOnline(false);
      }
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const stats = [
    { label: "Total Today", value: overview.total_accesses_today, icon: DoorOpen, iconBg: "bg-blue-600" },
    {
      label: "Granted",
      value: overview.granted_today,
      icon: CheckCircle,
      iconBg: "bg-green-700",
      valueColor: "text-green-400",
    },
    {
      label: "Denied",
      value: overview.denied_today,
      icon: XCircle,
      iconBg: "bg-red-700",
      valueColor: "text-red-400",
    },
    {
      label: "Delayed",
      value: overview.delayed_today,
      icon: Clock,
      iconBg: "bg-amber-700",
      valueColor: "text-amber-400",
    },
    {
      label: "Open Alerts",
      value: overview.active_alerts_count,
      icon: AlertTriangle,
      iconBg: "bg-red-700",
      valueColor: "text-red-400",
      pulse: true,
    },
    { label: "Active Users", value: overview.total_users, icon: Users, iconBg: "bg-purple-700" },
  ];

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

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Access Activity - Last 24 Hours</h2>
            <AccessTimelineChart data={timeline.length ? timeline : undefined} />
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Anomaly Distribution</h2>
            <AnomalyDistributionChart data={anomaly.length ? anomaly : undefined} />
          </div>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Top Access Points Today</h2>
            <TopAccessPointsChart data={topPoints.length ? topPoints : undefined} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Live Access Feed</h2>
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            </div>

            {logs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No access logs yet today</p>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 8).map((log, i) => (
                  <div
                    key={log.id ?? i}
                    className="flex items-center gap-3 px-3 py-2.5 bg-slate-700/40 rounded-lg"
                  >
                    <span className="text-slate-500 text-xs font-mono w-12 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-slate-300 text-sm flex-1 truncate">
                      {log.user ? `${log.user.first_name} ${log.user.last_name}` : log.badge_id_used ?? "-"}
                    </span>
                    <span className="text-slate-500 text-xs flex-1 truncate hidden md:block">
                      {log.access_point?.name ?? "-"}
                    </span>
                    <DecisionBadge decision={log.decision} />
                    <div className="w-20 flex-shrink-0">
                      <RiskBar score={log.risk_score} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
