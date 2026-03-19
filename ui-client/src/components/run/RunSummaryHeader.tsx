import { CheckCircle, XCircle, AlertTriangle, AlertOctagon, Clock } from 'lucide-react';

interface RunSummaryHeaderProps {
  runId: string;
  exitCode: number;
  duration: number;
  testsPassed: number;
  testsFailed: number;
}

type FailureType = 'success' | 'test-failure' | 'infra-failure' | 'policy-failure';

function getFailureType(exitCode: number): FailureType {
  if (exitCode === 0) return 'success';
  if (exitCode === 3) return 'policy-failure';
  if (exitCode === 2) return 'infra-failure';
  return 'test-failure';
}

export function RunSummaryHeader({ exitCode, duration, testsPassed, testsFailed }: RunSummaryHeaderProps) {
  const failureType = getFailureType(exitCode);

  const typeConfig = {
    'success': {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: 'All Tests Passed',
      description: 'Test suite completed successfully'
    },
    'test-failure': {
      icon: XCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      label: 'Test Failure',
      description: `${testsFailed} test${testsFailed !== 1 ? 's' : ''} failed`
    },
    'infra-failure': {
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: 'Infrastructure Failure',
      description: 'Runtime or infrastructure error occurred'
    },
    'policy-failure': {
      icon: AlertOctagon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      label: 'Policy Violation',
      description: 'Contract or integrity policy failed'
    }
  };

  const config = typeConfig[failureType];
  const Icon = config.icon;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={`border-2 rounded-lg p-6 ${config.bg} ${config.border}`} data-testid="run-summary-header">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left: Status */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${config.bg} border ${config.border}`}>
            <Icon className={config.color} size={32} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${config.color}`} data-testid="run-summary-status">
              {config.label}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{config.description}</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">Exit Code: {exitCode}</p>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex gap-6">
          {/* Duration */}
          <div className="text-center" data-testid="run-summary-duration">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock size={16} className="text-gray-400" />
              <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(duration)}</p>
          </div>

          {/* Passed */}
          <div className="text-center" data-testid="run-summary-passed">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Passed</p>
            <p className="text-2xl font-bold text-green-600">{testsPassed}</p>
          </div>

          {/* Failed */}
          <div className="text-center" data-testid="run-summary-failed">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-600">{testsFailed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
