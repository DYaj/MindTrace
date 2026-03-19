import { useSystemStatus } from '../hooks/useSystemStatus';
import { CheckCircle, XCircle, Activity, FileCode, Database, ArrowRight, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

function SystemPage() {
  const { data: system, isLoading } = useSystemStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading system status...</div>
      </div>
    );
  }

  if (!system) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Failed to load system status</div>
      </div>
    );
  }

  const statusCards = [
    {
      label: 'Runtime',
      icon: Activity,
      ok: system.runtime.state === 'available',
      detail: system.runtime.state === 'available' ? 'Available' : 'Not Available'
    },
    {
      label: 'Contract',
      icon: FileCode,
      ok: system.contract.state === 'available',
      detail: system.contract.state === 'available' ? 'Generated' : 'Not Generated'
    },
    {
      label: 'Cache',
      icon: Database,
      ok: system.cache.state === 'available',
      detail: system.cache.detail || (system.cache.state === 'available' ? 'Built' : 'Not Built')
    },
    {
      label: 'MCP',
      icon: Cpu,
      ok: system.mcp.state === 'available',
      detail: system.mcp.state === 'available' ? 'Installed' : 'Not Installed'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6" data-testid="system-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" data-testid="system-page-title">System Status</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Monitor system readiness and health</p>
      </div>

      {/* FIRST-TIME USER GUIDANCE */}
      {system.contract.state === 'missing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6" data-testid="system-getting-started">
          <h3 className="font-semibold text-blue-900 mb-2">Getting Started</h3>
          <p className="text-sm text-blue-800 mb-3">No contract detected. Follow these steps:</p>
          <div className="space-y-2">
            <Link
              to="/contract"
              data-testid="system-link-generate-contract"
              className="flex items-center gap-2 text-sm text-blue-800 hover:text-blue-600 hover:bg-blue-100 font-medium p-3 rounded-md transition-colors"
            >
              <span>1. Generate Contract</span>
              <ArrowRight size={16} />
              <span className="text-xs font-normal">(creates automation specification)</span>
            </Link>
            <Link
              to="/cache"
              data-testid="system-link-build-cache"
              className="flex items-center gap-2 text-sm text-blue-800 hover:text-blue-600 hover:bg-blue-100 font-medium p-3 rounded-md transition-colors"
            >
              <span>2. Build Cache</span>
              <ArrowRight size={16} />
              <span className="text-xs font-normal">(required - detects pages for testing)</span>
            </Link>
            <Link
              to="/runs"
              data-testid="system-link-run-tests"
              className="flex items-center gap-2 text-sm text-blue-800 hover:text-blue-600 hover:bg-blue-100 font-medium p-3 rounded-md transition-colors"
            >
              <span>3. Run Tests</span>
              <ArrowRight size={16} />
              <span className="text-xs font-normal">(executes your test suite)</span>
            </Link>
          </div>
        </div>
      )}

      {/* STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="system-status-cards">
        {statusCards.map(({ label, icon: Icon, ok, detail }) => (
          <div
            key={label}
            data-testid={`system-card-${label.toLowerCase()}`}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${ok ? 'bg-green-50' : 'bg-red-50'}`}>
                <Icon className={ok ? 'text-green-600' : 'text-red-600'} size={24} />
              </div>
              {ok ? (
                <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              ) : (
                <XCircle className="text-red-600 flex-shrink-0" size={20} />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">{label}</p>
              <p className="text-sm text-gray-600">{detail}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default SystemPage;
