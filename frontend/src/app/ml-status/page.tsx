"use client";

import { useState, useEffect } from "react";
import ApiStatus from "@/components/ui/ApiStatus";
import { getMLStatus } from "@/lib/api";
import type { MLStatus } from "@/lib/types";

const IF_METRICS = [
  ["F1-Score", "0.9777", true],
  ["AUC-ROC", "0.9997", true],
  ["Precision", "98.27%", false],
  ["Recall", "97.29%", false],
  ["FPR", "0.13%", true],
  ["Training Time", "0.46s", false],
  ["Inference", "9.6ms", false],
  ["Weight", "30%", false],
];

const AE_METRICS = [
  ["Architecture", "19->48->24->8->24->48->19", false],
  ["F1-Score", "0.9296", true],
  ["AUC-ROC", "1.0000", true],
  ["Recall", "100%", true],
  ["Precision", "86.85%", false],
  ["FPR", "1.14%", false],
  ["Training Time", "88.61s", false],
  ["Weight", "70%", false],
];

const FEATURES = [
  ["hour", "Hour of access (0-23)", "8-18", "0-5 or 22-23"],
  ["day_of_week", "Day (0=Mon to 6=Sun)", "0-4", "5-6"],
  ["is_weekend", "Weekend flag", "0", "1"],
  ["access_frequency_24h", "Accesses in last 24h", "1-8", "15+"],
  ["time_since_last_access_min", "Minutes since last scan", "30-480", "< 5 min"],
  ["location_match", "Zone matches department", "1", "0"],
  ["role_level", "Role clearance (1-3)", "1-3", "1 in restricted"],
  ["is_restricted_area", "Restricted zone flag", "0", "1 + low role"],
  ["is_first_access_today", "First scan of the day", "0/1", "Context only"],
  ["sequential_zone_violation", "Impossible zone sequence", "0", "1"],
  ["access_attempt_count", "Failed attempts before this", "0", "3+"],
  ["time_of_week", "Combined day+hour (0-167)", "8-90", "Outlier values"],
  ["hour_deviation_from_norm", "Deviation from user's usual hour", "< 2.0", "> 4.0"],
  ["geographic_impossibility", "Impossible travel flag", "0", "1"],
  ["distance_between_scans_km", "Distance from previous scan", "0-1", "> 5"],
  ["velocity_km_per_min", "Travel velocity", "< 0.2", "> 1.0"],
  ["zone_clearance_mismatch", "Zone requires higher clearance", "0", "1"],
  ["department_zone_mismatch", "Department does not match zone", "0", "1"],
  ["concurrent_session_detected", "Overlapping badge sessions", "0", "1"],
];

function ModelCard({
  title,
  weight,
  metrics,
  extra,
  active,
}: {
  title: string;
  weight: string;
  metrics: [string, string, boolean][];
  extra?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-base">{title}</h3>
          <p className="text-slate-500 text-xs mt-0.5">Weight: {weight}</p>
        </div>
        <span
          className={`w-3 h-3 rounded-full ${active ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
        />
      </div>
      <div className="space-y-2">
        {metrics.map(([k, v, highlight]) => (
          <div
            key={k}
            className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0"
          >
            <span className="text-slate-400 text-sm">{k}</span>
            <span className={`text-sm font-medium font-mono ${highlight ? "text-green-400" : "text-slate-200"}`}>
              {v}
            </span>
          </div>
        ))}
      </div>
      {extra}
    </div>
  );
}

export default function MLStatusPage() {
  const [status, setStatus] = useState<MLStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMLStatus();
      setStatus(data);
    } catch {
      setError("Cannot connect to server - showing demo data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const isEnsemble = status?.mode === "ensemble";
  const ifActive = status?.isolation_forest ?? true;
  const aeActive = status?.autoencoder ?? true;
  const artifactsReady =
    status?.if_artifact_found !== false && status?.ae_artifact_found !== false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Model Status</h1>
        <p className="text-slate-400 text-sm mt-1">Ensemble model performance and configuration</p>
      </div>

      {(loading || error) && <ApiStatus loading={loading} error={error} onRetry={fetchStatus} />}

      {!loading && !error && !artifactsReady && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-300 text-sm font-medium">Model artifacts not found</p>
          <p className="text-amber-400/90 text-xs mt-1">
            Train and export models to <code>ml/models</code> to enable ML scoring. Backend is currently using rule-based mode.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ModelCard
          title="Isolation Forest"
          weight="30%"
          metrics={IF_METRICS as [string, string, boolean][]}
          active={ifActive}
        />
        <ModelCard
          title="Autoencoder"
          weight="70%"
          metrics={AE_METRICS as [string, string, boolean][]}
          active={aeActive}
        />
        <div className="bg-slate-800 border-2 border-blue-600/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white font-semibold text-base">Ensemble</h3>
              <p className="text-slate-500 text-xs mt-0.5">IF x 0.3 + AE x 0.7</p>
            </div>
            <span
              className={`w-3 h-3 rounded-full ${isEnsemble ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
            />
          </div>

          {[
            ["F1-Score", "1.0000", true],
            ["AUC-ROC", "1.0000", true],
            ["Precision", "100%", true],
            ["Recall", "100%", true],
            ["FPR", "0.00%", true],
          ].map(([k, v]) => (
            <div
              key={k as string}
              className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0"
            >
              <span className="text-slate-400 text-sm">{k as string}</span>
              <span className="text-sm font-bold font-mono text-green-400">{v as string}</span>
            </div>
          ))}

          <div className="mt-5 bg-slate-900 rounded-lg p-4">
            <p className="text-slate-400 text-xs font-medium mb-3">Decision Thresholds</p>
            <div className="flex rounded-lg overflow-hidden h-10 mb-2">
              <div className="flex items-center justify-center text-xs font-bold text-white bg-green-700" style={{ flex: "30%" }}>
                GRANT
              </div>
              <div className="flex items-center justify-center text-xs font-bold text-white bg-amber-700" style={{ flex: "30%" }}>
                DELAY
              </div>
              <div className="flex items-center justify-center text-xs font-bold text-white bg-red-700" style={{ flex: "40%" }}>
                DENY
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>0.0</span>
              <span>{(status?.grant_threshold ?? 0.3).toFixed(2)}</span>
              <span>{(status?.deny_threshold ?? 0.7).toFixed(2)}</span>
              <span>1.0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">ML Features ({FEATURES.length} total)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                {["#", "Feature", "Description", "Normal Range", "Anomaly Indicator"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map(([feature, desc, normal, anomaly], i) => (
                <tr
                  key={feature}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-500 text-sm">{i + 1}</td>
                  <td className="px-4 py-3">
                    <code className="text-blue-400 text-xs bg-blue-400/10 px-2 py-0.5 rounded">{feature}</code>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{desc}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{normal}</td>
                  <td className="px-4 py-3 text-red-400 text-sm">{anomaly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Training Dataset Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Records", value: "500,000", color: "text-white" },
            { label: "Normal", value: "465,000", color: "text-green-400" },
            { label: "Anomalous", value: "35,000", color: "text-red-400" },
            { label: "Train / Test", value: "80% / 20%", color: "text-blue-400" },
            { label: "Features", value: "19", color: "text-purple-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
