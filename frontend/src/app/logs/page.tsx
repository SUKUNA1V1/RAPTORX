"use client";

import { useState, useEffect, useCallback } from "react";
import DecisionBadge from "@/components/ui/DecisionBadge";
import RiskBar from "@/components/ui/RiskBar";
import ApiStatus from "@/components/ui/ApiStatus";
import DecisionExplainer from "@/components/explainability/DecisionExplainer";
import { getLogs } from "@/lib/api";
import { MOCK_LOGS } from "@/lib/constants";
import type { AccessLog, Decision } from "@/lib/types";
import { ChevronRight } from "lucide-react";

const FILTERS: Array<Decision | "all"> = ["all", "granted", "denied", "delayed"];
const PAGE_SIZE = 20;

export default function LogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>(MOCK_LOGS as AccessLog[]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Decision | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<any>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLogs({
        decision: filter !== "all" ? filter : undefined,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      let items = data.items;
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(
          (l) =>
            l.user?.first_name?.toLowerCase().includes(q) ||
            l.user?.last_name?.toLowerCase().includes(q) ||
            l.badge_id_used?.toLowerCase().includes(q)
        );
      }
      setLogs(items.length ? items : (MOCK_LOGS as AccessLog[]));
      setTotal(data.total || items.length);
    } catch (err) {
      setError("Cannot connect to server - showing demo data");
      setLogs(MOCK_LOGS as AccessLog[]);
      setTotal(MOCK_LOGS.length);
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleExplain = async (logId: number) => {
    try {
      setExplanationLoading(true);
      setExplanationError(null);
      setSelectedLogId(logId);
      
      const response = await fetch(`http://localhost:8000/api/explainations/decision/${logId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch explanation: ${response.statusText}`);
      }
      
      const data = await response.json();
      setExplanation(data.explanation); // Extract the explanation from the response
    } catch (err) {
      setExplanationError(err instanceof Error ? err.message : "Failed to load explanation");
      console.error("Error fetching explanation:", err);
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleCloseExplainer = () => {
    setSelectedLogId(null);
    setExplanation(null);
    setExplanationError(null);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Access Logs</h1>
        <p className="text-slate-400 text-sm mt-1">{total > 0 ? `${total} total records` : "Access history"}</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex bg-slate-900 rounded-lg p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(0);
                }}
                className={`btn btn-sm capitalize transition-all
                            ${filter === f ? "btn-primary" : "btn-ghost"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search user or badge ID..."
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 min-w-[220px]"
          />
          <button onClick={fetch} className="btn btn-secondary">
            Refresh
          </button>
        </div>

        {(loading || error) && <ApiStatus loading={loading} error={error} onRetry={fetch} />}

        {!loading && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    {["Timestamp", "User", "Access Point", "Decision", "Risk Score", "Method", "Action"].map((h) => (
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
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm">
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, i) => (
                      <tr
                        key={log.id ?? i}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                          {new Date(log.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200 text-sm">
                            {log.user ? `${log.user.first_name} ${log.user.last_name}` : "-"}
                          </div>
                          <div className="text-slate-500 text-xs font-mono">{log.badge_id_used}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 text-sm">{log.access_point?.name ?? "-"}</div>
                          <div className="text-slate-500 text-xs">{log.access_point?.building}</div>
                        </td>
                        <td className="px-4 py-3">
                          <DecisionBadge decision={log.decision} />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="mx-auto w-full max-w-[160px]">
                            <RiskBar score={log.risk_score} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm capitalize">{log.method}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => log.id && handleExplain(log.id)}
                            disabled={!log.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Explain
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4 text-sm text-slate-500">
              <span>
                Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn btn-secondary btn-sm"
                >
                  Prev
                </button>
                <span className="px-3 py-1.5 text-slate-400">{page + 1} / {totalPages || 1}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Explainability Drawer */}
      {selectedLogId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800/95 backdrop-blur border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Decision Explanation</h2>
              <button
                onClick={handleCloseExplainer}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            {explanationLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-3 border-slate-600 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-400">Loading explanation...</p>
                </div>
              </div>
            ) : explanationError ? (
              <div className="p-8">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{explanationError}</p>
                </div>
              </div>
            ) : explanation ? (
              <div className="p-6">
                <DecisionExplainer 
                  logId={selectedLogId}
                  explanation={explanation}
                  onClose={handleCloseExplainer}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
