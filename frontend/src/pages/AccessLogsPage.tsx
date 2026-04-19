/**
 * Access Logs Page
 * Simplified version - advanced filtering coming soon
 */

import React from 'react';

export interface AccessLog {
  id: number;
  user_id: number;
  username: string;
  access_point_id: number;
  access_point_name: string;
  decision: 'granted' | 'denied' | 'delayed';
  risk_score: number;
  reason?: string;
  timestamp: string;
}

export const AccessLogsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Access Logs</h1>
        <p className="text-gray-600 mt-1">Monitor and filter system access attempts</p>
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Advanced filtering component loading...</p>
        </div>
      </div>
    </div>
  );
};

export default AccessLogsPage;
