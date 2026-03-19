import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RunListItem } from '@breakline/ui-types';
import { createPortal } from 'react-dom';

interface RunComparisonPanelProps {
  runA: RunListItem;
  runB: RunListItem;
  onClose: () => void;
}

export function RunComparisonPanel({ runA, runB, onClose }: RunComparisonPanelProps) {
  // Calculate deltas
  const passedDelta = runB.testsPassed - runA.testsPassed;
  const failedDelta = runB.testsFailed - runA.testsFailed;
  const durationDelta = runB.duration - runA.duration;
  const exitCodeDelta = runB.exitCode - runA.exitCode;

  const formatDuration = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDelta = (delta: number, unit: string = '') => {
    if (delta === 0) return '—';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta}${unit}`;
  };

  const getDeltaColor = (delta: number, inverse: boolean = false) => {
    if (delta === 0) return 'text-gray-600';
    const isNegative = inverse ? delta > 0 : delta < 0;
    return isNegative ? 'text-red-600' : 'text-green-600';
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Compare Runs</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Run identifiers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Run A</p>
              <p className="font-medium text-gray-900">{runA.runName}</p>
              <p className="text-xs text-gray-500">{new Date(runA.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Run B</p>
              <p className="font-medium text-gray-900">{runB.runName}</p>
              <p className="text-xs text-gray-500">{new Date(runB.timestamp).toLocaleString()}</p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Run A
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Run B
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delta
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Exit Code</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{runA.exitCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{runB.exitCode}</td>
                  <td className={`px-4 py-3 text-sm text-center font-medium ${getDeltaColor(exitCodeDelta, true)}`}>
                    {formatDelta(exitCodeDelta)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Tests Passed</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{runA.testsPassed}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{runB.testsPassed}</td>
                  <td className={`px-4 py-3 text-sm text-center font-medium ${getDeltaColor(passedDelta)}`}>
                    {formatDelta(passedDelta)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Tests Failed</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{runA.testsFailed}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{runB.testsFailed}</td>
                  <td className={`px-4 py-3 text-sm text-center font-medium ${getDeltaColor(failedDelta, true)}`}>
                    {formatDelta(failedDelta)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Duration</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{formatDuration(runA.duration)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{formatDuration(runB.duration)}</td>
                  <td className={`px-4 py-3 text-sm text-center font-medium ${getDeltaColor(durationDelta, true)}`}>
                    {formatDelta(durationDelta / 1000, 's')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {failedDelta !== 0 && (
            <div className={`p-4 rounded-lg ${failedDelta > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <p className={`text-sm font-medium ${failedDelta > 0 ? 'text-red-900' : 'text-green-900'}`}>
                {failedDelta > 0
                  ? `${Math.abs(failedDelta)} new failure${Math.abs(failedDelta) !== 1 ? 's' : ''} in Run B`
                  : `${Math.abs(failedDelta)} fewer failure${Math.abs(failedDelta) !== 1 ? 's' : ''} in Run B`
                }
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Link
              to={`/runs/${runA.runId}`}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Open Run A
            </Link>
            <Link
              to={`/runs/${runB.runId}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Open Run B
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
