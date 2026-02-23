"use client";

import { useState, useEffect } from "react";
import DecisionBadge from "@/components/ui/DecisionBadge";
import RiskBar from "@/components/ui/RiskBar";
import ApiStatus from "@/components/ui/ApiStatus";
import { requestAccess, getUsers, getAccessPointsList } from "@/lib/api";
import type { AccessDecision, User, AccessPoint } from "@/lib/types";

type DecisionType = AccessDecision["decision"];

type ScenarioKey = "normal" | "afterhours" | "wrongdept" | "highfreq" | "cloning" | "restricted";

type ScenarioConfig = {
  badge: string;
  point: number;
  label: string;
  expectedDecision: DecisionType;
  hourUtc: number;
  minuteUtc?: number;
  steps?: number;
  stepMinutes?: number;
  pointSequence?: number[];
  useDistinctZones?: boolean;
};

const SCENARIOS: Record<ScenarioKey, ScenarioConfig> = {
  normal: { badge: "B001", point: 1, label: "Normal 9AM", expectedDecision: "granted", hourUtc: 9 },
  afterhours: { badge: "B013", point: 3, label: "After Hours", expectedDecision: "delayed", hourUtc: 2 },
  wrongdept: { badge: "B019", point: 3, label: "Wrong Dept", expectedDecision: "denied", hourUtc: 10 },
  highfreq: {
    badge: "B011",
    point: 1,
    label: "High Freq",
    expectedDecision: "delayed",
    hourUtc: 9,
    steps: 12,
    stepMinutes: 1,
  },
  cloning: {
    badge: "B005",
    point: 6,
    label: "Badge Clone",
    expectedDecision: "denied",
    hourUtc: 2,
    steps: 3,
    stepMinutes: 1,
    pointSequence: [3, 5, 3],
  },
  restricted: { badge: "B011", point: 4, label: "Restricted", expectedDecision: "denied", hourUtc: 11 },
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
  const [history, setHistory] = useState<
    Array<
      AccessDecision & {
        badgeId: string;
        pointId: number;
        timestamp: string;
        scenarioLabel?: string;
        expectedDecision?: DecisionType;
      }
    >
  >([]);
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey | null>(null);

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

  const buildScenarioTimestamp = (scenario?: ScenarioConfig, offsetMinutes = 0) => {
    const now = new Date();
    if (!scenario) return new Date(now.getTime() + offsetMinutes * 60_000).toISOString();

    const ts = new Date(now);
    ts.setUTCHours(scenario.hourUtc, scenario.minuteUtc ?? 0, 0, 0);
    if (offsetMinutes) ts.setTime(ts.getTime() + offsetMinutes * 60_000);
    return ts.toISOString();
  };

  const resolveScenarioPointIds = (scenario?: ScenarioConfig) => {
    if (!scenario) return [pointId];
    if (scenario.pointSequence && scenario.pointSequence.length > 0) {
      return scenario.pointSequence;
    }
    if (scenario.useDistinctZones && points.length > 1) {
      const withZone = points.filter((p) => p.zone);
      const source = withZone.length > 1 ? withZone : points;
      for (let i = 0; i < source.length; i += 1) {
        for (let j = i + 1; j < source.length; j += 1) {
          const a = source[i];
          const b = source[j];
          if (!a || !b) continue;
          if (a.zone && b.zone && a.zone !== b.zone) {
            return [a.id, b.id, a.id];
          }
        }
      }
      return [source[0].id, source[1].id, source[0].id];
    }
    return [scenario.point];
  };

  const loadScenario = (name: ScenarioKey) => {
    const s = SCENARIOS[name];
    setBadge(s.badge);
    const resolvedPoints = resolveScenarioPointIds(s);
    setPointId(resolvedPoints[0] ?? s.point);
    setSelectedScenario(name);
  };

  const pushHistory = (
    entry: AccessDecision,
    meta: {
      badgeId: string;
      pointId: number;
      timestamp: string;
      scenarioLabel?: string;
      expectedDecision?: DecisionType;
    }
  ) => {
    setHistory((prev) => [{ ...entry, ...meta }, ...prev].slice(0, 10));
  };

  const run = async () => {
    setLoading(true);
    try {
      const scenario = selectedScenario ? SCENARIOS[selectedScenario] : undefined;
      const steps = scenario?.steps ?? 1;
      const stepMinutes = scenario?.stepMinutes ?? 0;
      const scenarioPointIds = resolveScenarioPointIds(scenario);
      let latest: AccessDecision | null = null;

      for (let i = 0; i < steps; i += 1) {
        const timestamp = buildScenarioTimestamp(scenario, i * stepMinutes);
        const accessPointId = scenarioPointIds[i] ?? scenarioPointIds[scenarioPointIds.length - 1];
        const r = await requestAccess({
          badge_id: badge,
          access_point_id: accessPointId,
          method,
          timestamp,
        });
        latest = r;
        pushHistory(r, {
          badgeId: badge,
          pointId: accessPointId,
          timestamp,
          scenarioLabel: scenario?.label,
          expectedDecision: scenario?.expectedDecision,
        });
      }

      if (latest) setResult(latest);
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
      const scenario = selectedScenario ? SCENARIOS[selectedScenario] : undefined;
      const timestamp = buildScenarioTimestamp(scenario);
      setResult(r);
      pushHistory(r, {
        badgeId: badge,
        pointId,
        timestamp,
        scenarioLabel: scenario?.label,
        expectedDecision: scenario?.expectedDecision,
      });
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
                onChange={(e) => {
                  setBadge(e.target.value);
                  setSelectedScenario(null);
                }}
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
                onChange={(e) => {
                  setPointId(Number(e.target.value));
                  setSelectedScenario(null);
                }}
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
              {selectedScenario && (
                <div className="mb-4 rounded-lg border border-white/10 bg-black/20 p-3 text-left text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-wide text-slate-400">Expected</span>
                    <span className="font-semibold text-slate-100">
                      {LABELS[SCENARIOS[selectedScenario].expectedDecision]}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="uppercase tracking-wide text-slate-400">Actual</span>
                    <span className="font-semibold text-slate-100">{LABELS[result.decision]}</span>
                  </div>
                  {SCENARIOS[selectedScenario].expectedDecision !== result.decision && (
                    <p className="mt-2 text-amber-300">Mismatch: scenario expectation not met.</p>
                  )}
                </div>
              )}
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Simulation History</h3>
              <button
                type="button"
                onClick={() => setHistory([])}
                disabled={history.length === 0}
                className="btn btn-secondary btn-sm"
              >
                Clear
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No simulations yet</p>
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex flex-col gap-2 px-3 py-2 bg-slate-700/40 rounded-lg">
                    <div className="flex items-center gap-3">
                    <span className="text-lg">{ICONS[h.decision]}</span>
                    <span className="text-slate-300 text-sm flex-1">{h.badgeId}</span>
                    <DecisionBadge decision={h.decision} />
                    <div className="w-16 flex-shrink-0">
                      <RiskBar score={h.risk_score} />
                    </div>
                    </div>
                    {h.expectedDecision && (
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{h.scenarioLabel ?? "Scenario"}</span>
                        <span>
                          Expected: {LABELS[h.expectedDecision]} | Actual: {LABELS[h.decision]}
                        </span>
                      </div>
                    )}
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
