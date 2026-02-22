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

      <DetailedPerformanceMonitor />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="font-semibold text-white mb-2">System Health Indicators</p>
          <ul className="space-y-1 text-xs">
            <li>🟢 <span className="text-green-400">Healthy</span>: CPU &lt; 80%, Memory &lt; 80%, Disk &lt; 90%</li>
            <li>🟡 <span className="text-amber-400">Warning</span>: Any metric approaching limits</li>
            <li>🔴 <span className="text-red-400">Critical</span>: Any metric exceeding safe limits</li>
          </ul>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="font-semibold text-white mb-2">Performance Thresholds</p>
          <ul className="space-y-1 text-xs">
            <li>🟢 API Response: &lt; 100ms (green)</li>
            <li>🟡 API Response: 100-500ms (yellow)</li>
            <li>🔴 Slow Query: &gt; 100ms flagged</li>
            <li>Query Count: Tracks all operations</li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-5">
        <p className="text-blue-300 text-sm">
          <span className="font-semibold">💡 Tip:</span> Use this dashboard to identify performance bottlenecks. 
          Slow queries and high resource usage indicate areas for optimization. Database and API metrics refresh automatically every 5 seconds.
        </p>
      </div>
    </div>
  );
}
