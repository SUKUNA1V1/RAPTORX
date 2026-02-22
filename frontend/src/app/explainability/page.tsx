"use client";

import ModelExplainability from "@/components/explainability/ModelExplainability";

export default function ExplainabilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Model Explainability</h1>
        <p className="text-slate-400 text-sm mt-1">
          Understand how the anomaly detection system makes decisions and interprets access patterns
        </p>
      </div>

      <ModelExplainability />

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Understanding Decisions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-700/30 rounded p-4">
            <h4 className="font-semibold text-green-400 mb-2">Granted Decisions</h4>
            <p className="text-sm text-slate-300 mb-3">
              Access is granted when the anomaly score is below the decision threshold, indicating normal behavior patterns.
            </p>
            <p className="text-xs text-slate-500">
              Look for: Low feature contributions, consistent patterns, expected timeframes.
            </p>
          </div>

          <div className="bg-slate-700/30 rounded p-4">
            <h4 className="font-semibold text-red-400 mb-2">Denied Decisions</h4>
            <p className="text-sm text-slate-300 mb-3">
              Access is denied when anomalies are detected, indicating unusual or risky behavior patterns.
            </p>
            <p className="text-xs text-slate-500">
              Look for: High feature contributions, unusual feature values, feature warnings.
            </p>
          </div>

          <div className="bg-slate-700/30 rounded p-4">
            <h4 className="font-semibold text-amber-400 mb-2">Confidence Level</h4>
            <p className="text-sm text-slate-300 mb-3">
              Shows how certain the system is in its decision. Higher confidence means both anomaly detection models agree.
            </p>
            <p className="text-xs text-slate-500">
              Range: 0-100%. Combine different models for robustness.
            </p>
          </div>

          <div className="bg-slate-700/30 rounded p-4">
            <h4 className="font-semibold text-blue-400 mb-2">Risk Levels</h4>
            <p className="text-sm text-slate-300 mb-3">
              Combines anomaly score with feature warnings to assign overall risk level.
            </p>
            <p className="text-xs text-slate-500">
              Levels: Low → Medium → High → Critical
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Key Concepts</h3>
        
        <div className="space-y-4">
          <div className="border-l-2 border-blue-500 pl-4">
            <h4 className="font-semibold text-slate-300 mb-1">Anomaly Scores</h4>
            <p className="text-sm text-slate-400">
              The system uses two complementary scoring methods:
            </p>
            <ul className="text-xs text-slate-500 mt-2 ml-4 list-disc space-y-1">
              <li><span className="font-semibold">Isolation Forest</span>: Tree-based anomaly detection</li>
              <li><span className="font-semibold">Autoencoder</span>: Neural network reconstruction error</li>
            </ul>
            <p className="text-xs text-slate-500 mt-2">
              Both scores are combined for a final decision (0.0 = benign, 1.0 = anomalous).
            </p>
          </div>

          <div className="border-l-2 border-green-500 pl-4">
            <h4 className="font-semibold text-slate-300 mb-1">Feature Contributions</h4>
            <p className="text-sm text-slate-400">
              Shows which features have the most impact on the anomaly score. Unusual values and rare patterns are highlighted.
            </p>
          </div>

          <div className="border-l-2 border-amber-500 pl-4">
            <h4 className="font-semibold text-slate-300 mb-1">Contributing Factors</h4>
            <p className="text-sm text-slate-400">
              Real-world context like "weekend access", "rare visitor", or "outside business hours" that influence the decision.
            </p>
          </div>

          <div className="border-l-2 border-red-500 pl-4">
            <h4 className="font-semibold text-slate-300 mb-1">Feature Warnings</h4>
            <p className="text-sm text-slate-400">
              Highlights specific unusual aspects like extreme percentile values or suspicious access patterns.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Feature Engineering</h3>
        
        <p className="text-sm text-slate-400 mb-4">
          The system monitors 13 carefully engineered features across multiple categories:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold text-slate-300 mb-2 text-sm">Temporal Features</h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Hour of day</li>
              <li>• Day of week</li>
              <li>• Weekend indicator</li>
              <li>• Hour deviation from norm</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-300 mb-2 text-sm">Behavioral Features</h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Access frequency (24h)</li>
              <li>• Time since last access</li>
              <li>• First access of day</li>
              <li>• Access attempt count</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-300 mb-2 text-sm">Risk Features</h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Location match</li>
              <li>• Role level</li>
              <li>• Restricted area</li>
              <li>• Zone violations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
