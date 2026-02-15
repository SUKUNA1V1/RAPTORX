"use client";

import { useState, useEffect } from "react";
import DecisionBadge from "@/components/ui/DecisionBadge";
import RiskBar from "@/components/ui/RiskBar";
import ApiStatus from "@/components/ui/ApiStatus";
import { requestAccess, getUsers, getAccessPointsList } from "@/lib/api";
import type { AccessDecision, User, AccessPoint } from "@/lib/types";

const SCENARIOS = {
  normal: { badge: "B001", point: 1, label: "Normal 9AM" },
  afterhours: { badge: "B013", point: 3, label: "After Hours" },
  wrongdept: { badge: "B019", point: 3, label: "Wrong Dept" },
  highfreq: { badge: "B011", point: 1, label: "High Freq" },
  cloning: { badge: "B005", point: 6, label: "Badge Clone" },
  restricted: { badge: "B011", point: 4, label: "Restricted" },
};

const ICONS: Record<string, string> = { granted: "G", denied: "D", delayed: "L" };
const LABELS: Record<string, string> = {
  granted: "ACCESS GRANTED",
  denied: "ACCESS DENIED",
  delayed: "ACCESS DELAYED",
};
const COLORS: Record<string, string> = {
  granted: "border-green-500/40 bg-green-500/10",
  denied: "border-red-500/40 bg-red-500/10",
  delayed: "border-amber-500/40 bg-amber-500/10",
};

export default function SimulatorPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [points, setPoints] = useState<AccessPoint[]>([]);
  const [badge, setBadge] = useState("B001");
  const [pointId, setPointId] = useState(1);
  const [method, setMethod] = useState("badge");
  const [result, setResult] = useState<AccessDecision | null>(null);
  const [history, setHistory] = useState<AccessDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLists = async () => {
    try {
      setLoadingData(true);
      setError(null);
      const [usersRes, pointsRes] = await Promise.allSettled([
        getUsers({ limit: 100 }),
        getAccessPointsList(),
      ]);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value);
      if (pointsRes.status === "fulfilled") setPoints(pointsRes.value);

      const allFailed = [usersRes, pointsRes].every((r) => r.status === "rejected");
      if (allFailed) setError("Cannot connect to server - showing demo data");
    } catch {
      setError("Cannot connect to server - showing demo data");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const loadScenario = (name: keyof typeof SCENARIOS) => {
    const s = SCENARIOS[name];
    setBadge(s.badge);
    setPointId(s.point);
  };

  const run = async () => {
    setLoading(true);
    try {
      const r = await requestAccess({
        badge_id: badge,
        access_point_id: pointId,
        method,
        timestamp: new Date().toISOString(),
      });
      setResult(r);
      setHistory((prev) => [r, ...prev].slice(0, 10));
      setApiMode(true);
    } catch {
      setApiMode(false);
      const MOCK_RESULTS: Record<string, AccessDecision> = {
        "B001-1": {
          decision: "granted",
          risk_score: 0.0507,
          if_score: 0.1685,
          ae_score: 0.0002,
          log_id: 18,
          mode: "ensemble",
          alert_created: false,
          reasoning: "Risk score 0.0507 below grant threshold 0.30",
        },
        "B013-3": {
          decision: "denied",
          risk_score: 0.8936,
          if_score: 0.8999,
          ae_score: 0.8909,
          log_id: 19,
          mode: "ensemble",
          alert_created: true,
          reasoning: "Risk score 0.8936 above deny threshold 0.60",
        },
        "B019-3": {
          decision: "denied",
          risk_score: 0.764,
          if_score: 0.9398,
          ae_score: 0.6886,
          log_id: 20,
          mode: "ensemble",
          alert_created: true,
          reasoning: "Risk score 0.7640 above deny threshold 0.60",
        },
        "B011-1": {
          decision: "delayed",
          risk_score: 0.4821,
          if_score: 0.65,
          ae_score: 0.42,
          log_id: 21,
          mode: "ensemble",
          alert_created: false,
          reasoning: "Risk score 0.4821 in delay zone - guard notified",
        },
        "B005-6": {
          decision: "denied",
          risk_score: 0.6362,
          if_score: 0.8011,
          ae_score: 0.5655,
          log_id: 22,
          mode: "ensemble",
          alert_created: true,
          reasoning: "Risk score 0.6362 above deny threshold 0.60",
        },
        "B011-4": {
          decision: "denied",
          risk_score: 0.8936,
          if_score: 0.8999,
          ae_score: 0.8909,
          log_id: 23,
          mode: "ensemble",
          alert_created: true,
          reasoning: "Risk score 0.8936 above deny threshold 0.60",
        },
      };
      const key = `${badge}-${pointId}`;
      const r =
        MOCK_RESULTS[key] ||
        ({
          decision: "delayed",
          risk_score: 0.45,
          if_score: 0.55,
          ae_score: 0.4,
          log_id: 99,
          mode: "demo",
          alert_created: false,
          reasoning: "Demo mode - backend offline",
        } as AccessDecision);
      setResult(r);
      setHistory((prev) => [r, ...prev].slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  const userOptions = users.length
    ? users.map((u) => ({
        value: u.badge_id,
        label: `${u.badge_id} - ${u.first_name} ${u.last_name} (${u.role})`,
      }))
    : Object.values(SCENARIOS).map((s) => ({ value: s.badge, label: s.badge }));

  const pointOptions = points.length
    ? points.map((p) => ({
        value: p.id,
        label: `${p.name} ${p.is_restricted ? "(Restricted)" : ""}`,
      }))
    : [
        { value: 1, label: "Main Entrance - Building A" },
        { value: 3, label: "Engineering Office A2" },
        { value: 4, label: "Server Room A3 (Restricted)" },
        { value: 6, label: "Main Entrance - Building B" },
      ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Access Request Simulator</h1>
          <p className="text-slate-400 text-sm mt-1">Test the AI decision engine with different scenarios</p>
        </div>
        {!apiMode && (
          <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs">
            Demo Mode
          </span>
        )}
      </div>

      {(loadingData || error) && <ApiStatus loading={loadingData} error={error} onRetry={loadLists} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Quick Scenarios</h2>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {Object.entries(SCENARIOS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => loadScenario(key as keyof typeof SCENARIOS)}
                className="btn btn-secondary btn-sm w-full text-left"
              >
                {s.label}
              </button>
            ))}
          </div>

          <h2 className="text-white font-semibold mb-4">Request Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">Badge ID</label>
              <select
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                {userOptions.map((o, i) => (
                  <option key={`${o.value}-${i}`} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">Access Point</label>
              <select
                value={pointId}
                onChange={(e) => setPointId(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                {pointOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="badge">Badge</option>
                <option value="pin">PIN</option>
                <option value="biometric">Biometric</option>
              </select>
            </div>

            <button onClick={run} disabled={loading} className="btn btn-primary w-full">
              {loading ? "Processing..." : "Send Access Request"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {result ? (
            <div className={`border-2 rounded-xl p-6 text-center ${COLORS[result.decision]}`}>
              <div className="text-5xl mb-3">{ICONS[result.decision]}</div>
              <div
                className={`text-xl font-bold mb-1 ${
                  result.decision === "granted"
                    ? "text-green-400"
                    : result.decision === "denied"
                    ? "text-red-400"
                    : "text-amber-400"
                }`}
              >
                {LABELS[result.decision]}
              </div>

              <div className="my-4 px-4">
                <RiskBar score={result.risk_score} />
              </div>

              <div className="bg-black/30 rounded-lg p-4 text-left space-y-2">
                {([
                  ["Risk Score", `${result.risk_score.toFixed(4)} (${Math.round(result.risk_score * 100)}%)`],
                  ["IF Score", result.if_score?.toFixed(4) ?? "-"],
                  ["AE Score", result.ae_score?.toFixed(4) ?? "-"],
                  ["Mode", result.mode],
                  ["Log ID", `#${result.log_id}`],
                  ["Alert", result.alert_created ? "Created" : "None"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-400">{k}</span>
                    <span className="text-slate-200 font-medium">{v}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-slate-400">{result.reasoning}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <div className="text-5xl mb-3">AI</div>
              <p className="text-slate-400">Select a scenario and click Send to see the AI decision</p>
            </div>
          )}

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Simulation History</h3>
            {history.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No simulations yet</p>
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-700/40 rounded-lg">
                    <span className="text-lg">{ICONS[h.decision]}</span>
                    <span className="text-slate-300 text-sm flex-1">{badge}</span>
                    <DecisionBadge decision={h.decision} />
                    <div className="w-16 flex-shrink-0">
                      <RiskBar score={h.risk_score} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
