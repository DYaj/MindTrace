import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Activity, Settings, FileCode, Database, Trash2 } from 'lucide-react';
import { useSystemStatus } from '../hooks/useSystemStatus';
import StatusIndicator from './StatusIndicator';
import { useState, useEffect } from 'react';
import { useJobStatus } from '../hooks/useJobStatus';

const STORAGE_KEY = 'breakline:runs:currentJobId';

function Layout() {
  const { data: system } = useSystemStatus();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY);
  });

  // Poll sessionStorage to detect when job ID changes
  useEffect(() => {
    const interval = setInterval(() => {
      const jobId = sessionStorage.getItem(STORAGE_KEY);
      setCurrentJobId(jobId);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check actual job status
  const { data: jobStatus } = useJobStatus(currentJobId);
  const isJobRunning = jobStatus && (jobStatus.status === 'running' || jobStatus.status === 'pending');

  const handleRunTests = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/actions/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (data.success) {
        const jobId = data.data.jobId;
        // Store job ID in sessionStorage
        sessionStorage.setItem(STORAGE_KEY, jobId);
        setCurrentJobId(jobId);
        // Navigate to Runs page with job info
        navigate('/runs', {
          state: {
            jobId: jobId,
            status: data.data.status
          }
        });
      }
    } catch (error) {
      console.error('Failed to start test run:', error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('⚠️ TESTING ONLY: Clear ALL data?\n\nThis will delete:\n• Contract\n• Cache\n• All test runs\n• History\n\nThis cannot be undone!')) {
      return;
    }

    setClearing(true);
    try {
      const response = await fetch('http://localhost:3001/api/actions/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (data.success) {
        // Clear session storage
        sessionStorage.clear();
        // Redirect to home
        navigate('/');
        // Force reload to refresh all data
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data. Check console for details.');
    } finally {
      setClearing(false);
    }
  };

  const navItems = [
    { to: '/', label: 'System', icon: Settings, exact: true },
    { to: '/contract', label: 'Contract', icon: FileCode },
    { to: '/cache', label: 'Cache', icon: Database },
    { to: '/runs', label: 'Runs', icon: Activity }
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* LEFT SIDEBAR - Hidden on mobile */}
      <aside className="hidden md:block md:w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">BreakLine</h1>
          <p className="text-sm text-gray-500 mt-1">Governance Control Plane</p>
        </div>

        <nav className="p-4 space-y-1" data-testid="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              data-testid={`nav-link-${label.toLowerCase()}`}
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

      {/* MOBILE NAV - Bottom bar on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10" data-testid="mobile-nav">
        <div className="flex justify-around">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              data-testid={`mobile-nav-link-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 px-4 ${
                  isActive
                    ? 'text-blue-700'
                    : 'text-gray-600'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile: Show logo */}
            <div className="md:hidden">
              <h1 className="text-lg font-bold text-gray-900">BreakLine</h1>
            </div>

            {/* Desktop: Show Run Tests button */}
            <div className="hidden md:flex items-center gap-2">
              <button
                data-testid="header-button-run-tests"
                onClick={handleRunTests}
                disabled={isJobRunning || system?.contract?.state === 'missing' || system?.cache?.state === 'missing'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  isJobRunning
                    ? 'Test run in progress'
                    : system?.contract?.state === 'missing' || system?.cache?.state === 'missing'
                    ? 'Contract and Cache required to run tests'
                    : ''
                }
              >
                {isJobRunning ? 'Test Running...' : 'Run Tests'}
              </button>
              <button
                data-testid="header-button-clear-all"
                onClick={handleClearAll}
                disabled={clearing}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                title="Testing: Clear all data"
              >
                <Trash2 size={16} />
                {clearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>

            {/* SYSTEM INDICATORS - Hide labels on mobile */}
            {system && (
              <div className="flex items-center gap-2 sm:gap-3" data-testid="header-status-indicators">
                <StatusIndicator
                  data-testid="header-status-runtime"
                  label="Runtime"
                  status={system.runtime.state === 'available' ? 'ok' : 'error'}
                />
                <StatusIndicator
                  data-testid="header-status-contract"
                  label="Contract"
                  status={system.contract.state === 'available' ? 'ok' : 'error'}
                />
                <StatusIndicator
                  data-testid="header-status-cache"
                  label="Cache"
                  status={system.cache.state === 'available' ? 'ok' : 'error'}
                />
              </div>
            )}
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
