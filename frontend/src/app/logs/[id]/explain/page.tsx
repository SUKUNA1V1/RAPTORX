"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DecisionExplainer from "@/components/explainability/DecisionExplainer";
import { api, getApiErrorMessage } from "@/lib/api";

interface ExplanationData {
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
  top_features: Array<{
    name: string;
    value: number;
    contribution: number;
    importance: number;
    percentile: number;
  }>;
  feature_warnings: string[];
  contributing_factors: Record<string, string>;
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function LogExplainPage() {
  const params = useParams();
  const logId = useMemo(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    return id ? Number(id) : null;
  }, [params.id]);

  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logId || Number.isNaN(logId)) {
      setError("Invalid log id.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadExplanation = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await api.get(`/api/explainations/decision/${logId}`);
        const payload = data?.explanation ?? data;

        if (!payload || typeof payload !== "object") {
          throw new Error("Explanation data is not available for this log");
        }

        const normalized: ExplanationData = {
          decision: String((payload as Record<string, unknown>).decision ?? "unknown"),
          confidence: toNumber((payload as Record<string, unknown>).confidence, 0),
          reason: String((payload as Record<string, unknown>).reason ?? "No explanation available"),
          risk_level: String((payload as Record<string, unknown>).risk_level ?? "unknown"),
          scores: {
            isolation_forest: toNumber(
              (payload as { scores?: Record<string, unknown> }).scores?.isolation_forest,
              0
            ),
            autoencoder: toNumber(
              (payload as { scores?: Record<string, unknown> }).scores?.autoencoder,
              0
            ),
            combined: toNumber((payload as { scores?: Record<string, unknown> }).scores?.combined, 0),
            threshold: toNumber((payload as { scores?: Record<string, unknown> }).scores?.threshold, 0.5),
          },
          top_features: Array.isArray((payload as { top_features?: unknown[] }).top_features)
            ? (payload as { top_features: Array<Record<string, unknown>> }).top_features.map((f) => ({
                name: String(f.name ?? "unknown_feature"),
                value: toNumber(f.value, 0),
                contribution: toNumber(f.contribution, 0),
                importance: toNumber(f.importance, 0),
                percentile: toNumber(f.percentile, 0),
              }))
            : [],
          feature_warnings: Array.isArray((payload as { feature_warnings?: unknown[] }).feature_warnings)
            ? (payload as { feature_warnings: unknown[] }).feature_warnings.map((w) => String(w))
            : [],
          contributing_factors:
            typeof (payload as { contributing_factors?: unknown }).contributing_factors === "object" &&
            (payload as { contributing_factors?: unknown }).contributing_factors !== null
              ? Object.fromEntries(
                  Object.entries(
                    (payload as { contributing_factors: Record<string, unknown> }).contributing_factors
                  ).map(([k, v]) => [k, String(v)])
                )
              : {},
        };

        if (isMounted) {
          setExplanation(normalized);
        }
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, "Failed to load explanation"));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadExplanation();

    return () => {
      isMounted = false;
    };
  }, [logId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Access Logs</p>
          <h1 className="text-2xl font-bold text-white">Decision Explanation</h1>
          <p className="text-sm text-slate-400">Log ID: {logId ?? "-"}</p>
        </div>
        <Link
          href="/logs"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Back to logs
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
          Loading explanation...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          {error}
        </div>
      ) : explanation ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <DecisionExplainer logId={logId ?? 0} explanation={explanation} />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
          No explanation available.
        </div>
      )}
    </div>
  );
}
