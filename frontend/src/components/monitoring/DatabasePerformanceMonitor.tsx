import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface QueryStat {
  count: number;
  total_time: number;
  min_time: number;
  max_time: number;
  avg_time: number;
  query_type: string;
  table_name: string;
}

interface SlowQuery {
  timestamp: string;
  duration_ms: number;
  query_type: string;
  table_name: string;
  statement: string;
}

interface DBPerformanceData {
  timestamp: string;
  total_queries: number;
  queries_by_type: Record<string, QueryStat>;
  slow_queries_count: number;
  recent_slow_queries: SlowQuery[];
}

export default function DatabasePerformanceMonitor() {
  const [data, setData] = useState<DBPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const response = await api.get<DBPerformanceData>("/api/stats/database-performance");
      setData(response.data);
    } catch (err) {
      setError("Failed to load database metrics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center text-slate-400">
        Loading database metrics...
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

  if (!data) return null;

  const sortedQueries = Object.values(data.queries_by_type).sort(
    (a, b) => b.avg_time - a.avg_time
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Total Queries</p>
          <p className="text-2xl font-bold text-white">{data.total_queries.toLocaleString()}</p>
          <p className="text-slate-500 text-xs mt-2">Since monitoring started</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Slow Queries</p>
          <p className="text-2xl font-bold text-amber-400">{data.slow_queries_count}</p>
          <p className="text-slate-500 text-xs mt-2">&gt; 100ms threshold</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Query Types</p>
          <p className="text-2xl font-bold text-blue-400">{Object.keys(data.queries_by_type).length}</p>
          <p className="text-slate-500 text-xs mt-2">Monitored patterns</p>
        </div>
      </div>

      {/* Query Performance Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Query Performance by Type</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-2 text-slate-400 font-medium">Type</th>
                <th className="text-left px-4 py-2 text-slate-400 font-medium">Table</th>
                <th className="text-right px-4 py-2 text-slate-400 font-medium">Count</th>
                <th className="text-right px-4 py-2 text-slate-400 font-medium">Avg (ms)</th>
                <th className="text-right px-4 py-2 text-slate-400 font-medium">Min (ms)</th>
                <th className="text-right px-4 py-2 text-slate-400 font-medium">Max (ms)</th>
              </tr>
            </thead>
            <tbody>
              {sortedQueries.map((stat) => (
                <tr key={`${stat.query_type}_${stat.table_name}`} className="border-b border-slate-700/50">
                  <td className="px-4 py-2 text-slate-200 font-medium">{stat.query_type}</td>
                  <td className="px-4 py-2 text-slate-400">{stat.table_name}</td>
                  <td className="text-right px-4 py-2 text-slate-300">{stat.count}</td>
                  <td
                    className={`text-right px-4 py-2 font-medium ${
                      stat.avg_time > 0.05 ? "text-amber-400" : "text-green-400"
                    }`}
                  >
                    {(stat.avg_time * 1000).toFixed(2)}
                  </td>
                  <td className="text-right px-4 py-2 text-slate-400">
                    {(stat.min_time * 1000).toFixed(2)}
                  </td>
                  <td className="text-right px-4 py-2 text-slate-400">
                    {(stat.max_time * 1000).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Slow Queries */}
      {data.recent_slow_queries.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Slow Queries</h3>
          <div className="space-y-3">
            {data.recent_slow_queries.slice().reverse().map((query, idx) => (
              <div key={idx} className="bg-slate-700/30 border border-amber-900/30 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-amber-400 font-medium text-sm">
                      {query.query_type} on {query.table_name}
                    </span>
                    <span className="text-white font-bold ml-2">{query.duration_ms.toLocaleString()}ms</span>
                  </div>
                  <span className="text-slate-500 text-xs">
                    {new Date(query.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-400 text-xs font-mono bg-slate-900 p-2 rounded">
                  {query.statement}
                  {query.statement.length >= 200 && "..."}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={fetchMetrics}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
      >
        Refresh Metrics
      </button>
    </div>
  );
}
