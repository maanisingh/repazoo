'use client';

import { useState, useEffect } from 'react';

interface WorkflowStatus {
  isRunning: boolean;
  isPaused: boolean;
  lastActivity?: string;
  nextScan?: string;
  scanCount: number;
  error?: string;
}

interface NotificationStatus {
  isActive: boolean;
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  monthlyEnabled: boolean;
  lastSent?: string;
}

export default function WorkflowDashboard() {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({
    isRunning: false,
    isPaused: false,
    scanCount: 0
  });

  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>({
    isActive: false,
    dailyEnabled: false,
    weeklyEnabled: false,
    monthlyEnabled: false
  });

  const [loading, setLoading] = useState(false);

  const fetchWorkflowStatus = async () => {
    try {
      const response = await fetch('/api/workflows/monitoring');
      if (response.ok) {
        const data = await response.json();
        setWorkflowStatus(data.workflow || workflowStatus);
        setNotificationStatus(data.notifications || notificationStatus);
      }
    } catch (error) {
      console.error('Failed to fetch workflow status:', error);
    }
  };

  useEffect(() => {
    fetchWorkflowStatus();
    const interval = setInterval(fetchWorkflowStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleWorkflowAction = async (action: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/workflows/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        await fetchWorkflowStatus();
      }
    } catch (error) {
      console.error(`Failed to ${action} monitoring:`, error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Monitoring Card */}
      <div className="bg-white rounded-lg shadow-md border p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            📊 Workflow Monitoring
          </h3>
          <p className="text-gray-600 text-sm">
            Manage reputation monitoring workflows and automation
          </p>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              workflowStatus.isRunning
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {workflowStatus.isRunning
                ? (workflowStatus.isPaused ? 'PAUSED' : 'RUNNING')
                : 'STOPPED'
              }
            </span>
            {workflowStatus.error && (
              <span className="text-red-600 text-sm">Error: {workflowStatus.error}</span>
            )}
          </div>

          {/* Workflow Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Last Activity:</span>
              <div className="font-medium">{workflowStatus.lastActivity || 'Never'}</div>
            </div>
            <div>
              <span className="text-gray-600">Next Scan:</span>
              <div className="font-medium">{workflowStatus.nextScan || 'Not scheduled'}</div>
            </div>
            <div>
              <span className="text-gray-600">Total Scans:</span>
              <div className="font-medium">{workflowStatus.scanCount}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleWorkflowAction('start')}
              disabled={loading || workflowStatus.isRunning}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ▶️ Start Monitoring
            </button>

            <button
              onClick={() => handleWorkflowAction('pause')}
              disabled={loading || !workflowStatus.isRunning || workflowStatus.isPaused}
              className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ⏸️ Pause
            </button>

            <button
              onClick={() => handleWorkflowAction('resume')}
              disabled={loading || !workflowStatus.isPaused}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ⏯️ Resume
            </button>

            <button
              onClick={() => handleWorkflowAction('stop')}
              disabled={loading || !workflowStatus.isRunning}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ⏹️ Stop
            </button>

            <button
              onClick={() => handleWorkflowAction('force-scan')}
              disabled={loading}
              className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              🔄 Force Scan
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings Card */}
      <div className="bg-white rounded-lg shadow-md border p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🔔 Notification Settings
          </h3>
          <p className="text-gray-600 text-sm">
            Configure automated report delivery preferences
          </p>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              notificationStatus.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {notificationStatus.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>

          {/* Schedule Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2 py-1 rounded text-xs ${
                notificationStatus.dailyEnabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}>
                Daily: {notificationStatus.dailyEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2 py-1 rounded text-xs ${
                notificationStatus.weeklyEnabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}>
                Weekly: {notificationStatus.weeklyEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2 py-1 rounded text-xs ${
                notificationStatus.monthlyEnabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}>
                Monthly: {notificationStatus.monthlyEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {notificationStatus.lastSent && (
            <div className="text-sm">
              <span className="text-gray-600">Last Sent:</span>
              <span className="font-medium ml-1">{notificationStatus.lastSent}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => handleWorkflowAction('enable-notifications')}
              disabled={loading}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              🔔 Enable Notifications
            </button>

            <button
              onClick={() => handleWorkflowAction('disable-notifications')}
              disabled={loading}
              className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              🔕 Disable Notifications
            </button>

            <button
              onClick={() => handleWorkflowAction('test-notification')}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              🧪 Test Notification
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center text-gray-600">
          ⏳ Processing...
        </div>
      )}
    </div>
  );
}