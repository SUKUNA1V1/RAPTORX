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

const ENSEMBLE_METRICS = [
  ["F1-Score", "1.0000"],
  ["AUC-ROC", "1.0000"],
  ["Precision", "100%"],
  ["Recall", "100%"],
  ["FPR", "0.00%"],
];

const DATASET_STATS = [
  { label: "Total Records", value: "500,000", color: "text-white" },
  { label: "Normal", value: "465,000", color: "text-green-400" },
  { label: "Anomalous", value: "35,000", color: "text-red-400" },
  { label: "Train / Test", value: "80% / 20%", color: "text-slate-200" },
  { label: "Features", value: "19", color: "text-slate-200" },
];

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

  const ifMetricMap = new Map(IF_METRICS.map(([k, v]) => [k, v]));
  const aeMetricMap = new Map(AE_METRICS.map(([k, v]) => [k, v]));
  const ensembleMetricMap = new Map(ENSEMBLE_METRICS);
  const metricOrder = Array.from(
    new Set([
      ...IF_METRICS.map(([k]) => k),
      ...AE_METRICS.map(([k]) => k),
      ...ENSEMBLE_METRICS.map(([k]) => k),
    ])
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 md:p-6 shadow-[0_16px_38px_rgba(0,0,0,0.2)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">Model Operations</p>
        <h1 className="text-2xl font-bold text-white">ML Status</h1>
        <p className="text-slate-400 text-sm mt-1">Live ensemble readiness, thresholds, and model health snapshot.</p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Component</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 text-slate-300 text-sm">Mode</td>
                <td className={`px-4 py-3 text-sm font-semibold ${isEnsemble ? "text-green-400" : "text-amber-400"}`}>
                  {isEnsemble ? "Ensemble" : "Rule-based"}
                </td>
                <td className="px-4 py-3 text-slate-400 text-sm">Decisioning strategy currently in use</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 text-slate-300 text-sm">Isolation Forest</td>
                <td className={`px-4 py-3 text-sm font-semibold ${ifActive ? "text-green-400" : "text-red-400"}`}>
                  {ifActive ? "Active" : "Offline"}
                </td>
                <td className="px-4 py-3 text-slate-400 text-sm">Weight 30% in ensemble</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 text-slate-300 text-sm">Autoencoder</td>
                <td className={`px-4 py-3 text-sm font-semibold ${aeActive ? "text-green-400" : "text-red-400"}`}>
                  {aeActive ? "Active" : "Offline"}
                </td>
                <td className="px-4 py-3 text-slate-400 text-sm">Weight 70% in ensemble</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-300 text-sm">Artifacts</td>
                <td className={`px-4 py-3 text-sm font-semibold ${artifactsReady ? "text-green-400" : "text-amber-400"}`}>
                  {artifactsReady ? "Ready" : "Missing"}
                </td>
                <td className="px-4 py-3 text-slate-400 text-sm">Model files availability check</td>
              </tr>
            </tbody>
          </table>
        </div>
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

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Model Metrics Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Metric</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Isolation Forest</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Autoencoder</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ensemble</th>
              </tr>
            </thead>
            <tbody>
              {metricOrder.map((metric) => (
                <tr key={metric} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3 text-slate-300 text-sm">{metric}</td>
                  <td className="px-4 py-3 text-slate-200 text-sm font-mono">{ifMetricMap.get(metric) ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-200 text-sm font-mono">{aeMetricMap.get(metric) ?? "-"}</td>
                  <td className="px-4 py-3 text-green-400 text-sm font-mono font-semibold">{ensembleMetricMap.get(metric) ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Decision Thresholds</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Decision</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rule</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Range</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 text-green-400 text-sm font-semibold">Grant</td>
                <td className="px-4 py-3 text-slate-300 text-sm">score &lt; grant_threshold</td>
                <td className="px-4 py-3 text-slate-200 text-sm font-mono">0.00 - {(status?.grant_threshold ?? 0.3).toFixed(2)}</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 text-yellow-400 text-sm font-semibold">Delay</td>
                <td className="px-4 py-3 text-slate-300 text-sm">grant_threshold ≤ score &lt; deny_threshold</td>
                <td className="px-4 py-3 text-slate-200 text-sm font-mono">{(status?.grant_threshold ?? 0.3).toFixed(2)} - {(status?.deny_threshold ?? 0.7).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-red-400 text-sm font-semibold">Deny</td>
                <td className="px-4 py-3 text-slate-300 text-sm">score ≥ deny_threshold</td>
                <td className="px-4 py-3 text-slate-200 text-sm font-mono">{(status?.deny_threshold ?? 0.7).toFixed(2)} - 1.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">ML Features</h2>
          <span className="text-xs text-slate-400">{FEATURES.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60">
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
                    <code className="text-slate-200 text-xs bg-slate-700/70 px-2 py-0.5 rounded">{feature}</code>
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statistic</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody>
              {DATASET_STATS.map((s) => (
                <tr key={s.label} className="border-b border-slate-700/50 last:border-0">
                  <td className="px-4 py-3 text-slate-300 text-sm">{s.label}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${s.color}`}>{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
