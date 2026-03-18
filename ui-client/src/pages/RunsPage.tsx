import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useRuns } from '../hooks/useRuns';
import { formatDistanceToNow } from 'date-fns';
import ExitCodeBadge from '../components/ExitCodeBadge';
import { JobStatusCard } from '../components/JobStatusCard';
import { api } from '../api/client';
import type { JobStatus } from '@breakline/ui-types';

function RunsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: runs, isLoading, refetch } = useRuns();
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Initialize job from navigation state (if coming from Layout "Run Tests" button)
  useEffect(() => {
    if (location.state?.jobId) {
      setCurrentJobId(location.state.jobId);
      // Clear the navigation state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleRunTests = async () => {
    try {
      const response = await api.runTests();
      setCurrentJobId(response.jobId);
    } catch (error) {
      console.error('Failed to start test run:', error);
    }
  };

  const handleJobComplete = (job: JobStatus) => {
    if (job.status === 'completed' || job.status === 'failed') {
      // Refresh runs list after job completes
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading runs...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Runs</h1>
          <p className="text-gray-600 mt-2">Test execution history</p>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleRunTests}
          disabled={!!currentJobId}
        >
          Run Tests
        </button>
      </div>

      {/* Job Status */}
      {currentJobId && (
        <JobStatusCard jobId={currentJobId} onComplete={handleJobComplete} />
      )}

      {!runs || runs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-600">No runs found</p>
          <p className="text-sm text-gray-500 mt-2">Run tests to see execution history</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Run Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exit Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {runs.map((run) => (
                <tr
                  key={run.runId}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/runs/${run.runId}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {run.runName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDistanceToNow(new Date(run.timestamp), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ExitCodeBadge code={run.exitCode} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {run.testsPassed} passed / {run.testsFailed} failed
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {(run.duration / 1000).toFixed(1)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RunsPage;
