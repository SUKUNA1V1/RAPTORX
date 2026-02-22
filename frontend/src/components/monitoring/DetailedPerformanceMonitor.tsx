import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AlertCircle, TrendingUp, Cpu, HardDrive } from "lucide-react";

interface DetailedMonitoringData {
  database: any;
  api: any;
  system: any;
}

export default function DetailedPerformanceMonitor() {
  const [data, setData] = useState<DetailedMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllMetrics = async () => {
    try {
      setError(null);
      setLoading(true);

      const [dbRes, apiRes, sysRes] = await Promise.all([
        api.get("/api/stats/database-performance"),
        api.get("/api/stats/api-performance"),
        api.get("/api/stats/system-health"),
      ]);

      setData({
        database: dbRes.data,
        api: apiRes.data,
        system: sysRes.data,
      });
    } catch (err) {
      setError("Failed to load monitoring data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMetrics();
    const interval = setInterval(fetchAllMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center text-slate-400">
        Loading monitoring data...
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

  const systemHealth = data.system;
  const apiStats = data.api;

  // Calculate health indicators
  const cpuHealthy = systemHealth.process.cpu_percent < 80;
  const memoryHealthy = systemHealth.system.memory_percent < 80;
  const diskHealthy = systemHealth.system.disk_percent < 90;

  return (
    <div className="space-y-6">
      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Process CPU</p>
            <Cpu size={16} className={cpuHealthy ? "text-green-400" : "text-amber-400"} />
          </div>
          <p className="text-2xl font-bold text-white">{systemHealth.process.cpu_percent.toFixed(1)}%</p>
          <p className="text-slate-500 text-xs mt-2">{systemHealth.system.cpu_percent.toFixed(1)}% system</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Memory</p>
            <HardDrive size={16} className={memoryHealthy ? "text-green-400" : "text-amber-400"} />
          </div>
          <p className="text-2xl font-bold text-white">
            {systemHealth.system.memory_percent.toFixed(1)}%
          </p>
          <p className="text-slate-500 text-xs mt-2">
            {systemHealth.system.memory_available_mb.toLocaleString()}MB available
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Disk</p>
            <HardDrive size={16} className={diskHealthy ? "text-green-400" : "text-amber-400"} />
          </div>
          <p className="text-2xl font-bold text-white">{systemHealth.system.disk_percent.toFixed(1)}%</p>
          <p className="text-slate-500 text-xs mt-2">Used space</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Process Threads</p>
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{systemHealth.process.threads}</p>
          <p className="text-slate-500 text-xs mt-2">Active threads</p>
        </div>
      </div>

      {/* API Performance Summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">API Endpoints Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-2 text-slate-400 font-medium">Endpoint</th>
                <th className="text-right px-4 py-2 text-slate-400 font-medium">Calls</th>
                <th className="text-right px-4 py-2 text-slate-400 font-medium">Avg Time (ms)</th>
                <th className="text-right px-4 py-2 text-slate-400 font-medium">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(apiStats.endpoints || {})
                .slice(0, 10)
                .map(([endpoint, stats]: [string, any]) => {
                  const successRate =
                    stats.total_calls > 0
                      ? ((stats.successful_calls / stats.total_calls) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <tr
                      key={endpoint}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-2 text-slate-200 font-medium text-xs">{endpoint}</td>
                      <td className="text-right px-4 py-2 text-slate-300">{stats.total_calls}</td>
                      <td
                        className={`text-right px-4 py-2 font-medium ${
                          stats.avg_time > 0.05 ? "text-amber-400" : "text-green-400"
                        }`}
                      >
                        {(stats.avg_time * 1000).toFixed(2)}
                      </td>
                      <td className="text-right px-4 py-2 text-slate-300">{successRate}%</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!apiStats.endpoints || Object.keys(apiStats.endpoints).length === 0 && (
          <p className="text-slate-400 text-sm mt-4">No API calls tracked yet</p>
        )}
      </div>

      {/* Database Performance Summary */}
      {data.database && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Query Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-700/30 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1">Total Queries</p>
              <p className="text-xl font-bold text-white">
                {data.database.total_queries?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1">Slow Queries</p>
              <p className="text-xl font-bold text-amber-400">
                {data.database.slow_queries_count || 0}
              </p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1">Query Types Monitored</p>
              <p className="text-xl font-bold text-blue-400">
                {Object.keys(data.database.queries_by_type || {}).length}
              </p>
            </div>
          </div>

          {data.database.recent_slow_queries && data.database.recent_slow_queries.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-amber-400 mb-3 flex items-center gap-2">
                <AlertCircle size={14} />
                Recent Slow Queries
              </p>
              <div className="space-y-2">
                {data.database.recent_slow_queries.slice(-5).map((q: any, i: number) => (
                  <div key={i} className="text-xs bg-slate-700/20 p-2 rounded border border-amber-900/30">
                    <p className="text-amber-300 font-semibold">
                      {q.query_type} on {q.table_name} - {q.duration_ms.toLocaleString()}ms
                    </p>
                    <p className="text-slate-400 font-mono mt-1">{q.statement}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={fetchAllMetrics}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
      >
        Refresh All Metrics
      </button>
    </div>
  );
}
