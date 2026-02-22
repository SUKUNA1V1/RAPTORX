import { useState } from "react";
import { ChevronDown, AlertTriangle, Shield, TrendingUp } from "lucide-react";

interface Feature {
  name: string;
  value: number;
  contribution: number;
  importance: number;
  percentile: number;
}

interface Explanation {
  decision: string;
  confidence: number;
  reason: string;
  risk_level: string;
  scores: {
    isolation_forest: number;
    autoencoder: number;
    combined: number;
    threshold: number;
  };
  top_features: Feature[];
  feature_warnings: string[];
  contributing_factors: Record<string, string>;
}

interface DecisionExplainerProps {
  logId: number;
  explanation: Explanation;
  onClose?: () => void;
}

export default function DecisionExplainer({ logId, explanation, onClose }: DecisionExplainerProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "features" | "factors">("overview");

  const riskColors: Record<string, string> = {
    low: "text-green-400 bg-green-900/20",
    medium: "text-yellow-400 bg-yellow-900/20",
    high: "text-orange-400 bg-orange-900/20",
    critical: "text-red-400 bg-red-900/20",
  };

  const decisionColors: Record<string, string> = {
    granted: "bg-green-500/20 text-green-400 border-green-500/30",
    denied: "bg-red-500/20 text-red-400 border-red-500/30",
    delayed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700/50 border-b border-slate-700 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-700/70 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <Shield size={18} className={explanation.decision === "granted" ? "text-green-400" : "text-red-400"} />
          <div>
            <h3 className="font-semibold text-white">Decision Explanation</h3>
            <p className="text-xs text-slate-400">Access Log #{logId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block px-2 py-1 rounded text-xs font-bold border uppercase ${decisionColors[explanation.decision]}`}>
            {explanation.decision}
          </span>
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {expanded && (
        <>
          {/* Main Reason */}
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <p className="text-slate-200 text-sm leading-relaxed">{explanation.reason}</p>
          </div>

          {/* Confidence and Risk */}
          <div className="grid grid-cols-2 gap-4 p-4 border-b border-slate-700 bg-slate-800/50">
            <div>
              <p className="text-xs text-slate-400 mb-1">CONFIDENCE</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${explanation.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-white">
                  {(explanation.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">RISK LEVEL</p>
              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${riskColors[explanation.risk_level]}`}>
                {explanation.risk_level.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Anomaly Scores */}
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <p className="text-xs text-slate-400 font-semibold mb-3 uppercase">Anomaly Scores</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Isolation Forest</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-700 rounded h-2">
                    <div
                      className="bg-purple-500 h-2 rounded"
                      style={{ width: `${explanation.scores.isolation_forest * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-slate-300 w-12 text-right">
                    {explanation.scores.isolation_forest.toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Autoencoder</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-700 rounded h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded"
                      style={{ width: `${explanation.scores.autoencoder * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-slate-300 w-12 text-right">
                    {explanation.scores.autoencoder.toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                <span className="text-sm font-semibold text-slate-200">Combined Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-700 rounded h-2">
                    <div
                      className={`h-2 rounded ${explanation.scores.combined > explanation.scores.threshold ? "bg-red-500" : "bg-green-500"}`}
                      style={{ width: `${explanation.scores.combined * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono font-bold text-slate-200 w-12 text-right">
                    {explanation.scores.combined.toFixed(3)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 pt-2">
                Threshold: <span className="font-mono">{explanation.scores.threshold.toFixed(3)}</span>
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700 bg-slate-800/50">
            {(["overview", "features", "factors"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2 text-xs font-semibold uppercase transition-colors ${
                  activeTab === tab
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {tab === "overview" && "Warnings"}
                {tab === "features" && "Features"}
                {tab === "factors" && "Factors"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === "overview" && (
              <div className="space-y-2">
                {explanation.feature_warnings.length > 0 ? (
                  explanation.feature_warnings.map((warning, i) => (
                    <div key={i} className="flex gap-2 p-2 bg-amber-900/20 border border-amber-700/30 rounded text-sm text-amber-300">
                      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No feature warnings detected</p>
                )}
              </div>
            )}

            {activeTab === "features" && (
              <div className="space-y-3">
                {explanation.top_features.map((feat, i) => (
                  <div key={i} className="bg-slate-700/30 rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">{feat.name}</p>
                        <p className="text-xs text-slate-500">Percentile: {feat.percentile.toFixed(0)}th</p>
                      </div>
                      <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
                        {feat.value.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <div className="bg-slate-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${feat.contribution > 0 ? "bg-red-500" : "bg-blue-500"}`}
                            style={{ width: `${Math.abs(feat.importance) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{(feat.importance * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "factors" && (
              <div className="space-y-2">
                {Object.entries(explanation.contributing_factors).length > 0 ? (
                  Object.entries(explanation.contributing_factors).map(([factor, description]) => (
                    <div key={factor} className="bg-slate-700/30 rounded p-3">
                      <p className="font-semibold text-slate-300 text-sm capitalize">{factor.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-400 mt-1">{description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No special contributing factors identified</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
