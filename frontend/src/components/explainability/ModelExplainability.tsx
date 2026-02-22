import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { TrendingUp, AlertTriangle, Info } from "lucide-react";

interface ModelInsight {
  model_type: string;
  ensemble_method: string;
  feature_count: number;
  decision_threshold: number;
  model_behavior: Record<string, string>;
  strengths: string[];
  limitations: string[];
}

interface FeatureImportance {
  feature: string;
  importance: number;
  description: string;
}

interface ThresholdBehavior {
  current_threshold: number;
  decision_logic: Record<string, string>;
  score_interpretation: Record<string, string>;
  empirical_performance: Record<string, number>;
}

export default function ModelExplainability() {
  const [insights, setInsights] = useState<ModelInsight | null>(null);
  const [importance, setImportance] = useState<FeatureImportance[]>([]);
  const [threshold, setThreshold] = useState<ThresholdBehavior | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [insightsRes, importanceRes, thresholdRes] = await Promise.all([
          api.get("/api/explainations/model-insights"),
          api.get("/api/explainations/feature-importance"),
          api.get("/api/explainations/threshold-behavior"),
        ]);

        setInsights(insightsRes.data);
        setImportance(importanceRes.data.features || []);
        setThreshold(thresholdRes.data);
      } catch (err) {
        setError("Failed to load model explainability data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center text-slate-400">
        Loading model insights...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Model Overview */}
      {insights && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Model Architecture</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-700/30 rounded p-4">
              <p className="text-xs text-slate-400 font-semibold mb-1">MODEL TYPE</p>
              <p className="text-white font-mono text-sm">{insights.model_type}</p>
            </div>
            <div className="bg-slate-700/30 rounded p-4">
              <p className="text-xs text-slate-400 font-semibold mb-1">ENSEMBLE METHOD</p>
              <p className="text-white font-mono text-sm">{insights.ensemble_method}</p>
            </div>
            <div className="bg-slate-700/30 rounded p-4">
              <p className="text-xs text-slate-400 font-semibold mb-1">FEATURES</p>
              <p className="text-white font-mono text-sm">{insights.feature_count} dimensions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-green-400 mb-2 flex gap-2 items-center">
                <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                Strengths
              </h3>
              <ul className="space-y-2">
                {insights.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-green-400">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-amber-400 mb-2 flex gap-2 items-center">
                <AlertTriangle size={14} />
                Limitations
              </h3>
              <ul className="space-y-2">
                {insights.limitations.map((l, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-amber-400">•</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Feature Importance */}
      {importance.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex gap-2 items-center">
            <TrendingUp size={20} className="text-blue-400" />
            Feature Importance
          </h2>

          <div className="space-y-3">
            {importance.slice(0, 8).map((feat, i) => (
              <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-slate-200">{feat.feature}</p>
                    <p className="text-xs text-slate-500 mt-1">{feat.description}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-400">
                    {(feat.importance * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${feat.importance * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            These features have the most influence on anomaly detection decisions.
          </p>
        </div>
      )}

      {/* Threshold Behavior */}
      {threshold && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Decision Thresholds & Behavior</h2>

          <div className="bg-slate-700/30 rounded p-4 mb-4">
            <p className="text-sm text-slate-400 mb-1 font-semibold">Current Decision Threshold</p>
            <p className="text-2xl font-bold text-white font-mono">
              {threshold.current_threshold.toFixed(3)}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-semibold text-white mb-2 flex gap-2 items-center">
                <Info size={16} className="text-blue-400" />
                Decision Logic
              </p>
              <div className="space-y-2 ml-6">
                {Object.entries(threshold.decision_logic).map(([decision, logic]) => (
                  <div key={decision} className="flex gap-2">
                    <span className="text-slate-400 font-mono text-sm min-w-20">{decision}:</span>
                    <span className="text-slate-300 font-mono text-sm">{logic}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">Score Interpretation</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(threshold.score_interpretation).map(([score, meaning]) => (
                  <div key={score} className="bg-slate-700/30 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Score {score}</p>
                    <p className="text-sm text-slate-300">{meaning}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">Model Performance Metrics</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(threshold.empirical_performance).map(([metric, value]) => (
                  <div key={metric} className="bg-slate-700/30 rounded p-3">
                    <p className="text-xs text-slate-400 uppercase mb-1">
                      {metric.replace(/_/g, " ")}
                    </p>
                    <p className="text-lg font-bold text-blue-400">
                      {(typeof value === "number" && value < 1
                        ? (value * 100).toFixed(0)
                        : value.toFixed(2))}
                      {typeof value === "number" && value < 1 ? "%" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3 flex gap-2 items-center">
          <Info size={16} className="text-blue-400" />
          How This System Works
        </h3>
        <ul className="text-sm text-blue-200 space-y-2 ml-6 list-disc">
          <li>
            <span className="font-semibold">Isolation Forest</span>: Detects anomalies by
            isolating unusual feature combinations in a decision tree forest
          </li>
          <li>
            <span className="font-semibold">Autoencoder</span>: Neural network that learns to
            reconstruct normal patterns; high reconstruction error indicates anomaly
          </li>
          <li>
            <span className="font-semibold">Ensemble</span>: Combines both models with equal
            weighting for robust detection
          </li>
          <li>
            <span className="font-semibold">Features</span>: 13 engineered features capturing
            temporal, frequency, location, and behavioral patterns
          </li>
        </ul>
      </div>
    </div>
  );
}
