/**
 * Dashboard Page
 * Simplified version - real-time features coming soon
 */

import React from 'react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to RaptorX Access Control System</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {[
            { label: 'Total Accesses', value: '2,847', icon: '🚪' },
            { label: 'Approvals Today', value: '156', icon: '✓' },
            { label: 'Denials Today', value: '12', icon: '✗' },
            { label: 'Risk Alerts', value: '3', icon: '⚠️' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl mb-2">{card.icon}</div>
              <p className="text-gray-600 text-sm">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Real-Time Updates</h2>
          <p className="text-gray-500">Live alerts and notifications loading...</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
