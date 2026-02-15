"use client";

import { useState, useEffect, useCallback } from "react";
import SeverityBadge from "@/components/ui/SeverityBadge";
import ApiStatus from "@/components/ui/ApiStatus";
import { getAlerts, resolveAlert } from "@/lib/api";
import { MOCK_ALERTS, SEVERITY_BAR_COLORS } from "@/lib/constants";
import type { AnomalyAlert, AlertSeverity } from "@/lib/types";

type FilterType = "all" | "open" | AlertSeverity;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>(MOCK_ALERTS as AnomalyAlert[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [resolving, setResolving] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAlerts({ limit: 50 });
      setAlerts(data.length ? data : (MOCK_ALERTS as AnomalyAlert[]));
    } catch {
      setError("Cannot connect to server - showing demo data");
      setAlerts(MOCK_ALERTS as AnomalyAlert[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    const id = setInterval(fetch, 10000);
    return () => clearInterval(id);
  }, [fetch]);

  const handleResolve = async (id: number) => {
    setResolving(id);
    try {
      await resolveAlert(id);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "resolved", is_resolved: true, resolved_at: new Date().toISOString() }
            : a
        )
      );
    } catch {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_resolved: true } : a)));
    } finally {
      setResolving(null);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "open") return !a.is_resolved;
    return a.severity === filter && !a.is_resolved;
  });

  const open = alerts.filter((a) => !a.is_resolved);
  const critical = alerts.filter((a) => a.severity === "critical" && !a.is_resolved);
  const resolved = alerts.filter((a) => a.is_resolved);
  const fp = alerts.filter((a) => a.status === "false_positive");

  const FILTER_TABS: Array<{ key: FilterType; label: string }> = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "critical", label: "Critical" },
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Anomaly Alerts</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time security incident management</p>
        </div>
        <button onClick={fetch} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open Alerts", value: open.length, color: "text-red-400" },
          { label: "Critical", value: critical.length, color: "text-red-500" },
          { label: "Resolved Today", value: resolved.length, color: "text-green-400" },
          { label: "False Positives", value: fp.length, color: "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center">
            <div className={`text-3xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-slate-400 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1 w-fit gap-1">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`btn btn-sm transition-all
                        ${filter === key ? "btn-primary" : "btn-ghost"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {(loading || error) && <ApiStatus loading={loading} error={error} onRetry={fetch} />}

      {!loading && (
        <>
          {filtered.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <p className="text-green-400 text-lg">OK</p>
              <p className="text-slate-400 mt-2">No alerts in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-slate-800 border border-slate-700 rounded-xl p-5 flex gap-4 transition-opacity
                              ${alert.is_resolved ? "opacity-50" : ""}`}
                >
                  <div
                    className="w-1 rounded-full flex-shrink-0 self-stretch"
                    style={{ background: SEVERITY_BAR_COLORS[alert.severity] }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <SeverityBadge severity={alert.severity} />
                      <span className="text-white font-semibold text-sm capitalize">
                        {alert.alert_type.replace(/_/g, " ")}
                      </span>
                      {alert.is_resolved && (
                        <span className="text-green-400 text-xs ml-auto flex items-center gap-1">
                          Resolved
                          {alert.resolved_at && (
                            <span className="text-slate-500">{new Date(alert.resolved_at).toLocaleTimeString()}</span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="text-slate-400 text-xs mb-2 flex flex-wrap gap-3">
                      <span>{new Date(alert.created_at).toLocaleString()}</span>
                      {alert.confidence && (
                        <span>{Math.round(alert.confidence * 100)}% confidence</span>
                      )}
                      <span>{alert.triggered_by}</span>
                    </div>

                    {alert.description && <p className="text-slate-300 text-sm mb-3">{alert.description}</p>}

                    {!alert.is_resolved && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleResolve(alert.id)}
                          disabled={resolving === alert.id}
                          className="btn btn-primary btn-sm"
                        >
                          {resolving === alert.id ? "Resolving..." : "Resolve"}
                        </button>
                        <button className="btn btn-secondary btn-sm">
                          False Positive
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
