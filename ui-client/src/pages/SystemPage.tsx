import { useSystemStatus } from '../hooks/useSystemStatus';
import { useRuns } from '../hooks/useRuns';
import { useIntegrity } from '../hooks/useIntegrity';
import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Activity,
  FileCode,
  Database,
  ArrowRight,
  Cpu,
  AlertTriangle,
  Shield,
  Clock,
  TrendingUp,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import ExitCodeBadge from '../components/ExitCodeBadge';

/**
 * Status badge with integrated tooltip
 */
interface StatusBadgeProps {
  icon: React.ElementType;
  label: string;
  tooltipContent: string;
  bgColor: string;
  textColor: string;
}

function StatusBadge({ icon: Icon, label, tooltipContent, bgColor, textColor }: StatusBadgeProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 ${bgColor} ${textColor} rounded-full text-sm font-medium cursor-help transition-opacity hover:opacity-90`}
      >
        <Icon size={16} />
        {label}
      </button>

      {isVisible && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-gray-900 text-white text-sm rounded-lg shadow-lg p-4 z-50">
          <div className="text-gray-200 leading-relaxed">
            {tooltipContent}
          </div>
          {/* Arrow */}
          <div className="absolute -top-2 left-4 w-4 h-4 bg-gray-900 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}

function SystemPage() {
  const { data: system, isLoading: systemLoading, refetch } = useSystemStatus();
  const { data: runs, isLoading: runsLoading } = useRuns();
  const { data: integrity } = useIntegrity();

  if (systemLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6" data-testid="system-page-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-48 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!system) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6" data-testid="system-page-error">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-red-900 mb-1">Failed to Load System Status</h3>
              <p className="text-sm text-red-800 mb-4">
                Unable to retrieve system status information. The system service may be unavailable.
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const contractMissing = system.contract.state === 'missing';
  const cacheMissing = system.cache.state === 'missing';
  const runtimeMissing = system.runtime.state === 'missing';

  // Calculate system health
  const hasIntegrityIssues = integrity && (
    integrity.contractGate.status === 'invalid' ||
    integrity.cacheGate.status === 'invalid' ||
    integrity.driftCheck.drift === true
  );

  // Check if system has been used (has run history)
  const hasRunHistory = runs && runs.length > 0;

  // Detect "not created" state - no data exists yet
  const isNotCreated = !hasRunHistory && (contractMissing || cacheMissing);

  // Only show critical issues if system has been used before
  // On initial/empty state, show "Getting Started" instead of critical warnings
  const showCriticalCallouts = hasRunHistory && (contractMissing || cacheMissing || runtimeMissing);

  const isSystemReady = !contractMissing && !cacheMissing && !runtimeMissing && !hasIntegrityIssues;
  const hasCriticalIssues = showCriticalCallouts;
  const hasWarnings = !isSystemReady && !hasCriticalIssues && !isNotCreated;

  const recentRuns = runs?.slice(0, 5) || [];

  const statusCards = [
    {
      label: 'Runtime',
      icon: Activity,
      ok: system.runtime.state === 'available',
      detail: system.runtime.state === 'available' ? 'Available' : 'Not Available',
      link: null
    },
    {
      label: 'Contract',
      icon: FileCode,
      ok: system.contract.state === 'available',
      detail: system.contract.state === 'available' ? 'Generated' : 'Not Generated',
      link: '/contract'
    },
    {
      label: 'Cache',
      icon: Database,
      ok: system.cache.state === 'available',
      detail: system.cache.detail || (system.cache.state === 'available' ? 'Built' : 'Not Built'),
      link: '/cache'
    },
    {
      label: 'MCP',
      icon: Cpu,
      ok: system.mcp.state === 'available',
      detail: system.mcp.state === 'available' ? 'Installed' : 'Not Installed',
      link: null
    }
  ];

  // Show onboarding when: no contract OR no first run
  const showOnboarding = contractMissing || !hasRunHistory;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6" data-testid="system-page">
      {/* Header with Status Badge */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" data-testid="system-page-title">System Status</h1>
          {isSystemReady ? (
            <StatusBadge
              icon={CheckCircle}
              label="System Ready"
              tooltipContent="All components are operational and integrity checks have passed. Your system is ready to run tests."
              bgColor="bg-green-100"
              textColor="text-green-800"
            />
          ) : hasCriticalIssues ? (
            <StatusBadge
              icon={XCircle}
              label="Critical Issues"
              tooltipContent="Required components are missing. Cannot run tests until resolved."
              bgColor="bg-red-100"
              textColor="text-red-800"
            />
          ) : hasWarnings ? (
            <StatusBadge
              icon={AlertTriangle}
              label="System Warnings"
              tooltipContent="System is partially operational. Some components may need attention. Check integrity for details."
              bgColor="bg-yellow-100"
              textColor="text-yellow-800"
            />
          ) : isNotCreated ? (
            <StatusBadge
              icon={HelpCircle}
              label="Setup Required"
              tooltipContent="Get started by generating your contract and building your cache. These are the foundational components needed to run tests."
              bgColor="bg-blue-100"
              textColor="text-blue-800"
            />
          ) : null}
        </div>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {isSystemReady
            ? 'All components operational. Ready to run tests.'
            : 'Monitor system readiness and health at a glance'}
        </p>
      </div>

      {/* Active Repository Display */}
      {system.repository && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" data-testid="active-repository">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-semibold text-gray-900">Active Repository</h2>
                {system.repository.isExternal && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    External Repo
                  </span>
                )}
              </div>
              <p className="text-lg font-mono font-semibold text-gray-900 mb-1">
                {system.repository.name}
              </p>
              <p className="text-xs font-mono text-gray-600 break-all">
                {system.repository.path}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Panel */}
      {showOnboarding && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6" data-testid="onboarding-panel">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Breakline</h2>
          <p className="text-sm text-gray-700 mb-6">
            Set up and run your first governed test in 3 steps.
          </p>

          <div className="space-y-4">
            {/* Step 1: Generate Contract */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Generate Contract</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Create the automation definition for this repository.
                </p>
                {!contractMissing ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle size={16} />
                    <span className="font-medium">Contract generated</span>
                  </div>
                ) : (
                  <Link
                    to="/contract"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Generate Contract
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </div>

            {/* Step 2: Build Cache */}
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                contractMissing ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white'
              }`}>
                2
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${contractMissing ? 'text-gray-500' : 'text-gray-900'}`}>
                  Build Cache
                </h3>
                <p className={`text-sm mb-3 ${contractMissing ? 'text-gray-500' : 'text-gray-600'}`}>
                  Generate runtime context from the contract.
                </p>
                {!cacheMissing ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle size={16} />
                    <span className="font-medium">Cache built</span>
                  </div>
                ) : contractMissing ? (
                  <div className="text-sm text-gray-500 italic">
                    Requires contract
                  </div>
                ) : (
                  <Link
                    to="/cache"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Build Cache
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </div>

            {/* Step 3: Run Tests */}
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                (contractMissing || cacheMissing) ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white'
              }`}>
                3
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${(contractMissing || cacheMissing) ? 'text-gray-500' : 'text-gray-900'}`}>
                  Run Tests
                </h3>
                <p className={`text-sm mb-3 ${(contractMissing || cacheMissing) ? 'text-gray-500' : 'text-gray-600'}`}>
                  Execute tests using the defined contract and cache.
                </p>
                {hasRunHistory ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle size={16} />
                    <span className="font-medium">Tests executed</span>
                  </div>
                ) : (contractMissing || cacheMissing) ? (
                  <div className="text-sm text-gray-500 italic">
                    Requires contract + cache
                  </div>
                ) : (
                  <Link
                    to="/runs"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Run Tests
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ISSUES BANNER - Only show when there are actual warnings or critical issues (not for setup required) */}
      {(hasCriticalIssues || hasWarnings) && (
        <div className={`rounded-lg border-2 p-6 ${
          hasCriticalIssues ? 'bg-red-50 border-red-200' :
          'bg-yellow-50 border-yellow-200'
        }`} data-testid="system-current-state">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {hasCriticalIssues ? (
                <XCircle className="text-red-600" size={36} />
              ) : (
                <AlertTriangle className="text-yellow-600" size={36} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`text-xl font-semibold mb-2 ${
                hasCriticalIssues ? 'text-red-900' :
                'text-yellow-900'
              }`}>
                {hasCriticalIssues ? 'Critical Issues Detected' :
                 'System Warnings'}
              </h2>
              <p className={`text-sm mb-3 ${
                hasCriticalIssues ? 'text-red-800' :
                'text-yellow-800'
              }`}>
                {hasCriticalIssues ? 'Required components are missing. Cannot run tests until resolved.' :
                 'System is partially operational. Some components may need attention.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {contractMissing && (
                  <Link
                    to="/contract"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-red-300 text-red-800 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                  >
                    Generate Contract
                    <ArrowRight size={14} />
                  </Link>
                )}
                {cacheMissing && (
                  <Link
                    to="/cache"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-red-300 text-red-800 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                  >
                    Build Cache
                    <ArrowRight size={14} />
                  </Link>
                )}
                {hasIntegrityIssues && (
                  <Link
                    to="/integrity"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-yellow-300 text-yellow-800 rounded-lg hover:bg-yellow-50 text-sm font-medium transition-colors"
                  >
                    Check Integrity
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRITICAL CALLOUTS - Only show if system has been used before */}
      {showCriticalCallouts && contractMissing && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6" data-testid="system-contract-missing-callout">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={28} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Contract Missing</h3>
              <p className="text-sm text-red-800 mb-4">
                Your automation contract defines what to test. Generate a contract to begin.
              </p>
              <Link
                to="/contract"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Go to Contract Page
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {showCriticalCallouts && !contractMissing && cacheMissing && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6" data-testid="system-cache-missing-callout">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={28} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Cache Missing</h3>
              <p className="text-sm text-red-800 mb-4">
                Cache detects pages for testing. Build cache to enable test runs.
              </p>
              <Link
                to="/cache"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Go to Cache Page
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {!contractMissing && !cacheMissing && hasIntegrityIssues && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6" data-testid="system-integrity-issues-callout">
          <div className="flex items-start gap-4">
            <Shield className="text-yellow-600 flex-shrink-0" size={28} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Integrity Issues Detected</h3>
              <p className="text-sm text-yellow-800 mb-4">
                Contract validation, cache binding, or drift checks have failed. Review integrity gates.
              </p>
              <Link
                to="/integrity"
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
              >
                View Integrity Gates
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/runs"
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <Activity className="text-blue-600" size={24} />
            <div>
              <p className="font-medium text-gray-900">Test Runs</p>
              <p className="text-xs text-gray-500">View execution history</p>
            </div>
          </Link>
          <Link
            to="/contract"
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <FileCode className="text-purple-600" size={24} />
            <div>
              <p className="font-medium text-gray-900">Contract</p>
              <p className="text-xs text-gray-500">Automation specification</p>
            </div>
          </Link>
          <Link
            to="/cache"
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <Database className="text-green-600" size={24} />
            <div>
              <p className="font-medium text-gray-900">Cache</p>
              <p className="text-xs text-gray-500">Page detection</p>
            </div>
          </Link>
          <Link
            to="/integrity"
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <Shield className="text-orange-600" size={24} />
            <div>
              <p className="font-medium text-gray-900">Integrity</p>
              <p className="text-xs text-gray-500">Safety gates</p>
            </div>
          </Link>
        </div>
      </div>

      {/* STATUS CARDS WITH LINKS */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Component Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="system-status-cards">
          {statusCards.map(({ label, icon: Icon, ok, detail, link }) => {
            if (link) {
              return (
                <Link
                  key={label}
                  to={link}
                  data-testid={`system-card-${label.toLowerCase()}`}
                  className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
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
                  {link && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 font-medium">
                      <span>View details</span>
                      <ArrowRight size={12} />
                    </div>
                  )}
                </div>
              </Link>
              );
            }

            return (
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
            );
          })}
        </div>
      </div>

      {/* RECENT RUNS */}
      {!runsLoading && recentRuns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Test Runs</h2>
            <Link
              to="/runs"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" data-testid="system-recent-runs">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Run</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Results</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentRuns.map((run) => (
                  <tr
                    key={run.runId}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => window.location.href = `/runs/${run.runId}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{run.runName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ExitCodeBadge code={run.exitCode} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-600 font-medium">{run.testsPassed} passed</span>
                        <span className="text-red-600 font-medium">{run.testsFailed} failed</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>{formatDistanceToNow(new Date(run.timestamp), { addSuffix: true })}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemPage;
