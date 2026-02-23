"use client";

import DetailedPerformanceMonitor from "@/components/monitoring/DetailedPerformanceMonitor";

export default function PerformanceMonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Performance Monitoring</h1>
        <p className="text-slate-400 text-sm mt-1">
          Real-time system health, API performance, and database query monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="font-semibold text-white mb-2">System Health Indicators</p>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400" aria-label="Healthy" />
            <span className="w-3 h-3 rounded-full bg-amber-400" aria-label="Warning" />
            <span className="w-3 h-3 rounded-full bg-red-400" aria-label="Critical" />
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="font-semibold text-white mb-2">Performance Thresholds</p>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400" aria-label="Fast" />
            <span className="w-3 h-3 rounded-full bg-amber-400" aria-label="Moderate" />
            <span className="w-3 h-3 rounded-full bg-red-400" aria-label="Slow" />
            <span className="w-3 h-3 rounded-full bg-slate-300" aria-label="Total" />
          </div>
        </div>
      </div>

      <DetailedPerformanceMonitor />

      <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-5">
        <p className="text-blue-300 text-sm">
          <span className="font-semibold">💡 Tip:</span> Use this dashboard to identify performance bottlenecks. 
          Slow queries and high resource usage indicate areas for optimization. Use the refresh button to update metrics on demand.
        </p>
      </div>
    </div>
  );
}
