/**
 * Real-Time Notifications Component
 * Displays real-time alerts and access events
 */

import React, { useState, useEffect } from 'react';
import { useRealtime, RealtimeMessage, getRealtimeService } from '../../lib/realtime';

interface Notification {
  id: string;
  type: 'alert' | 'access_event' | 'system_status';
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

interface RealtimeNotificationsPanelProps {
  maxNotifications?: number;
  autoHideDuration?: number;
}

export const RealtimeNotificationsPanel: React.FC<
  RealtimeNotificationsPanelProps
> = ({ maxNotifications = 10, autoHideDuration = 5000 }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Subscribe to all real-time messages
  useRealtime('alert', (message: RealtimeMessage) => {
    const notification: Notification = {
      id: `${Date.now()}-alert`,
      type: 'alert',
      message: (message.data.title as string) || 'New Alert',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      severity: (message.data.severity as any) || 'medium',
      timestamp: message.timestamp,
    };

    setNotifications((prev) => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });

    // Auto-remove notification after duration
    if (autoHideDuration > 0) {
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id)
        );
      }, autoHideDuration);
    }
  });

  useRealtime('access_event', (message: RealtimeMessage) => {
    const notification: Notification = {
      id: `${Date.now()}-access`,
      type: 'access_event',
      message: `Access ${message.data.decision} for user ${message.data.user_id}`,
      severity:
        (message.data.decision as string) === 'denied' ? 'high' : 'low',
      timestamp: message.timestamp,
    };

    setNotifications((prev) => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });

    if (autoHideDuration > 0) {
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id)
        );
      }, autoHideDuration);
    }
  });

  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-900 border-red-700';
      case 'high':
        return 'bg-red-800 border-red-600';
      case 'medium':
        return 'bg-yellow-800 border-yellow-600';
      case 'low':
        return 'bg-blue-800 border-blue-600';
      default:
        return 'bg-gray-800 border-gray-600';
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getSeverityColor(
            notification.severity
          )} border rounded-lg p-4 text-white shadow-lg animate-slide-in`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-semibold">{notification.message}</p>
              <p className="text-xs text-gray-300 mt-1">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-gray-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Hook to get connection status
 */
export const useRealtimeStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');

  useEffect(() => {
    const checkConnection = () => {
      const service = getRealtimeService();

      if (service.isConnected()) {
        setIsConnected(true);
        setConnectionStatus('connected');
      } else {
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  return { isConnected, connectionStatus };
};

/**
 * Connection Status Indicator Component
 */
export const RealtimeStatusIndicator: React.FC = () => {
  const { connectionStatus } = useRealtimeStatus();

  const getStatusColor = (): string => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-sm text-gray-700">
        {connectionStatus === 'connected'
          ? 'Connected'
          : connectionStatus === 'connecting'
          ? 'Connecting...'
          : connectionStatus === 'disconnected'
          ? 'Disconnected'
          : 'Error'}
      </span>
    </div>
  );
};

export default RealtimeNotificationsPanel;
