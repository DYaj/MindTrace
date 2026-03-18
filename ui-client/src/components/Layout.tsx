import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Activity, Settings, FileCode, Database } from 'lucide-react';
import { useSystemStatus } from '../hooks/useSystemStatus';
import StatusIndicator from './StatusIndicator';
import { useState } from 'react';

function Layout() {
  const { data: system } = useSystemStatus();
  const navigate = useNavigate();
  const [runningTests, setRunningTests] = useState(false);

  const handleRunTests = async () => {
    setRunningTests(true);
    try {
      const response = await fetch('http://localhost:3001/api/actions/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (data.success) {
        // Navigate to Runs page with job info
        navigate('/runs', {
          state: {
            jobId: data.data.jobId,
            status: data.data.status
          }
        });
      }
    } catch (error) {
      console.error('Failed to start test run:', error);
    } finally {
      setRunningTests(false);
    }
  };

  const navItems = [
    { to: '/', label: 'System', icon: Settings, exact: true },
    { to: '/contract', label: 'Contract', icon: FileCode },
    { to: '/cache', label: 'Cache', icon: Database },
    { to: '/runs', label: 'Runs', icon: Activity }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">BreakLine</h1>
          <p className="text-sm text-gray-500 mt-1">Governance Control Plane</p>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleRunTests}
                disabled={runningTests}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {runningTests ? 'Starting...' : 'Run Tests'}
              </button>
            </div>

            {/* SYSTEM INDICATORS */}
            {system && (
              <div className="flex items-center gap-3">
                <StatusIndicator
                  label="Runtime"
                  status={system.runtime.state === 'available' ? 'ok' : 'error'}
                />
                <StatusIndicator
                  label="Contract"
                  status={system.contract.state === 'available' ? 'ok' : 'warning'}
                />
                <StatusIndicator
                  label="Cache"
                  status={system.cache.state === 'available' ? 'ok' : 'warning'}
                />
              </div>
            )}
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
