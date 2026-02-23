"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import DecisionBadge from "@/components/ui/DecisionBadge";
import RiskBar from "@/components/ui/RiskBar";
import ApiStatus from "@/components/ui/ApiStatus";
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

  const fetchLogs = useCallback(async () => {
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
    fetchLogs();
  }, [fetchLogs]);

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
          <button onClick={fetchLogs} className="btn btn-secondary">
            Refresh
          </button>
        </div>

        {(loading || error) && <ApiStatus loading={loading} error={error} onRetry={fetchLogs} />}

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
                          {log.id ? (
                            <Link
                              href={`/logs/${log.id}/explain`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded text-xs font-medium transition-colors"
                            >
                              Explain
                              <ChevronRight size={14} />
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-500">N/A</span>
                          )}
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

    </div>
  );
}
