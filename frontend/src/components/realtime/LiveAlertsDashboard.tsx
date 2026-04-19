/**
 * Live Alerts Dashboard
 * Real-time display of system alerts and access events
 */

import React, { useState, useCallback } from 'react';
import { useRealtime, RealtimeMessage } from '../../lib/realtime';

interface LiveAlert {
  id: string;
  type: 'alert' | 'access_event' | 'system_status';
  title: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  data?: Record<string, unknown>;
}

interface LiveAlertsDashboardProps {
  maxAlerts?: number;
  autoRefreshInterval?: number;
}

export const LiveAlertsDashboard: React.FC<LiveAlertsDashboardProps> = ({
  maxAlerts = 50,
}) => {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium'>(
    'all'
  );

  // Subscribe to alerts
  useRealtime('alert', useCallback((message: RealtimeMessage) => {
    const alert: LiveAlert = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'alert',
      title: (message.data.title as string) || 'Alert',
      description: message.data.description as string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      severity: (message.data.severity as any) || 'medium',
      timestamp: message.timestamp,
      data: message.data,
    };

    setAlerts((prev) => [alert, ...prev].slice(0, maxAlerts));
  }, [maxAlerts]));

  // Subscribe to access events
  useRealtime('access_event', useCallback((message: RealtimeMessage) => {
    const alert: LiveAlert = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'access_event',
      title: `Access ${message.data.decision}`,
      description: `User ${message.data.user_id} at access point ${message.data.access_point_id}`,
      severity:
        (message.data.decision as string) === 'denied' ? 'high' : 'low',
      timestamp: message.timestamp,
      data: message.data,
    };

    setAlerts((prev) => [alert, ...prev].slice(0, maxAlerts));
  }, [maxAlerts]));

  const filteredAlerts = alerts.filter(
    (alert) => filter === 'all' || alert.severity === filter
  );

  const getSeverityIcon = (severity?: string): string => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const getSeverityBg = (severity?: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const severityStats = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    high: alerts.filter((a) => a.severity === 'high').length,
    medium: alerts.filter((a) => a.severity === 'medium').length,
    low: alerts.filter((a) => a.severity === 'low').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Critical</p>
          <p className="text-2xl font-bold text-red-600">
            {severityStats.critical}
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">High</p>
          <p className="text-2xl font-bold text-orange-600">
            {severityStats.high}
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Medium</p>
          <p className="text-2xl font-bold text-yellow-600">
            {severityStats.medium}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Low</p>
          <p className="text-2xl font-bold text-green-600">
            {severityStats.low}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['all', 'critical', 'high', 'medium'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No alerts matching filter
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 ${getSeverityBg(
                alert.severity
              )}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl">
                    {getSeverityIcon(alert.severity)}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {alert.title}
                    </p>
                    {alert.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {alert.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional event details */}
              {alert.type === 'access_event' && alert.data && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20 text-xs text-gray-600">
                  <p>
                    Risk Score:{' '}
                    <span className="font-semibold">
                      {(alert.data.risk_score as number)?.toFixed(2)}%
                    </span>
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Compact Alert Summary for Dashboard Header
 */
export const AlertSummary: React.FC = () => {
  const [criticalCount, setCriticalCount] = useState(0);
  const [highCount, setHighCount] = useState(0);

  useRealtime('alert', useCallback((message: RealtimeMessage) => {
    const severity = message.data.severity as string;
    if (severity === 'critical') {
      setCriticalCount((prev) => Math.min(prev + 1, 999));
    } else if (severity === 'high') {
      setHighCount((prev) => Math.min(prev + 1, 999));
    }
  }, []));

  return (
    <div className="flex gap-2">
      {criticalCount > 0 && (
        <div className="bg-red-500 text-white rounded-full px-3 py-1 text-sm font-semibold">
          🔴 {criticalCount}
        </div>
      )}
      {highCount > 0 && (
        <div className="bg-orange-500 text-white rounded-full px-3 py-1 text-sm font-semibold">
          🟠 {highCount}
        </div>
      )}
    </div>
  );
};

export default LiveAlertsDashboard;
