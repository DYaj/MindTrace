import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useRuns } from '../hooks/useRuns';
import { formatDistanceToNow } from 'date-fns';
import ExitCodeBadge from '../components/ExitCodeBadge';
import { api } from '../api/client';
import type { JobStatus } from '@breakline/ui-types';

function RunsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: runs, isLoading, refetch } = useRuns();
  const [runningJob, setRunningJob] = useState<JobStatus | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  // Initialize running job from navigation state (if coming from Layout "Run Tests" button)
  useEffect(() => {
    if (location.state?.jobId) {
      setRunningJob({
        jobId: location.state.jobId,
        type: 'run',
        status: location.state.status || 'pending',
        createdAt: new Date().toISOString()
      });
      // Clear the navigation state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Poll job status
  useEffect(() => {
    if (!runningJob || runningJob.status === 'completed' || runningJob.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const job = await api.getJob(runningJob.jobId);
        setRunningJob(job);

        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(pollInterval);
          // Refetch runs list after job completes
          refetch();
        }
      } catch (error) {
        console.error('Failed to poll job:', error);
        clearInterval(pollInterval);
        setJobError(error instanceof Error ? error.message : 'Unknown error');
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [runningJob, refetch]);

  const handleRunTests = async () => {
    try {
      setJobError(null);
      const response = await api.runTests();
      setRunningJob({
        jobId: response.jobId,
        type: 'run',
        status: response.status,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      setJobError(error instanceof Error ? error.message : 'Failed to start test run');
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
        <div className="flex items-center gap-3">
          {runningJob && runningJob.status !== 'completed' && runningJob.status !== 'failed' && (
            <span className="text-sm text-gray-600">
              {runningJob.status === 'running' ? 'Running tests...' : 'Starting...'}
            </span>
          )}
          {jobError && (
            <span className="text-sm text-red-600">{jobError}</span>
          )}
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleRunTests}
            disabled={runningJob?.status === 'running' || runningJob?.status === 'pending'}
          >
            Run Tests
          </button>
        </div>
      </div>

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
