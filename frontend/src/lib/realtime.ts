/**
 * Real-time Updates Service using WebSocket
 * Provides real-time notifications for alerts, access events, and system status
 */

import { useEffect } from 'react';

export type MessageType = 'alert' | 'access_event' | 'system_status' | 'audit_log';

export interface RealtimeMessage {
  type: MessageType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface AlertNotification {
  type: 'alert';
  id: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
}

export interface AccessEventNotification {
  type: 'access_event';
  user_id: number;
  access_point_id: number;
  decision: 'granted' | 'denied' | 'delayed';
  risk_score: number;
  timestamp: string;
}

class RealtimeService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<MessageType, Set<(msg: RealtimeMessage) => void>> =
    new Map();
  private generalListeners: Set<(msg: RealtimeMessage) => void> = new Set();

  constructor(baseUrl: string = '') {
    // Determine WebSocket URL from current location or parameter
    if (baseUrl) {
      this.url = baseUrl;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      this.url = `${protocol}//${host}/api/ws`;
    }
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✓ Connected to real-time service');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as RealtimeMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Attempt to reconnect to the server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay);
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: RealtimeMessage): void {
    // Call type-specific listeners
    const typeListeners = this.listeners.get(message.type);
    if (typeListeners) {
      typeListeners.forEach((listener) => listener(message));
    }

    // Call general listeners
    this.generalListeners.forEach((listener) => listener(message));
  }

  /**
   * Subscribe to a specific message type
   */
  subscribe(
    type: MessageType,
    listener: (msg: RealtimeMessage) => void
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * Subscribe to all messages
   */
  subscribeAll(listener: (msg: RealtimeMessage) => void): () => void {
    this.generalListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.generalListeners.delete(listener);
    };
  }

  /**
   * Send a message to the server
   */
  send(message: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
  }
}

// Singleton instance
let realtimeService: RealtimeService | null = null;

/**
 * Get or create the real-time service instance
 */
export function getRealtimeService(): RealtimeService {
  if (!realtimeService) {
    realtimeService = new RealtimeService();
  }
  return realtimeService;
}

/**
 * Hook for React components to use real-time updates
 */
export function useRealtime(
  type: MessageType,
  callback: (msg: RealtimeMessage) => void
) {
  const service = getRealtimeService();

  // Subscribe on mount
  useEffect(() => {
    // Try to connect if not already connected
    if (!service.isConnected()) {
      service.connect().catch((error) => {
        console.error('Failed to connect to real-time service:', error);
      });
    }

    const unsubscribe = service.subscribe(type, callback);

    // Cleanup on unmount
    return unsubscribe;
  }, [type, callback, service]);
}

export default getRealtimeService;
