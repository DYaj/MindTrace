import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRuns } from '../hooks/useRuns';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useJobStatus } from '../hooks/useJobStatus';
import { formatDistanceToNow } from 'date-fns';
import ExitCodeBadge from '../components/ExitCodeBadge';
import { JobStatusCard } from '../components/JobStatusCard';
import { RunFilterBar } from '../components/runs/RunFilterBar';
import { api } from '../api/client';
import { AlertTriangle, Trash2, Play } from 'lucide-react';
import type { JobStatus } from '@breakline/ui-types';

const STORAGE_KEY = 'breakline:runs:currentJobId';

function RunsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: runs, isLoading, refetch } = useRuns();
  const { data: system } = useSystemStatus();
  const [currentJobId, setCurrentJobId] = useState<string | null>(() => {
    // Initialize from sessionStorage
    return sessionStorage.getItem(STORAGE_KEY);
  });
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [runToDelete, setRunToDelete] = useState<string | null>(null);

  // Filter state
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');

  // Check actual job status to determine if button should be disabled
  const { data: jobStatus } = useJobStatus(currentJobId);
  const isJobRunning = jobStatus && (jobStatus.status === 'running' || jobStatus.status === 'pending');

  // Initialize job from navigation state (if coming from Layout "Run Tests" button)
  useEffect(() => {
    if (location.state?.jobId) {
      // Clear any existing timeout from previous job
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }

      const jobId = location.state.jobId;
      setCurrentJobId(jobId);
      sessionStorage.setItem(STORAGE_KEY, jobId);
      // Clear the navigation state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Persist currentJobId to sessionStorage
  useEffect(() => {
    if (currentJobId) {
      sessionStorage.setItem(STORAGE_KEY, currentJobId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [currentJobId]);

  const handleRunTests = async () => {
    try {
      // Clear any existing timeout from previous job
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }

      const response = await api.runTests();
      const jobId = response.jobId;
      setCurrentJobId(jobId);
      sessionStorage.setItem(STORAGE_KEY, jobId);
    } catch (error) {
      console.error('Failed to start test run:', error);
    }
  };

  const handleJobComplete = (job: JobStatus) => {
    if (job.status === 'completed' || job.status === 'failed') {
      // Refresh runs list after job completes
      refetch();

      // Clear any existing timeout
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }

      // Keep job visible for 30 seconds after completion, then clear
      // But only if the jobId hasn't changed (i.e., no new job started)
      const completedJobId = job.jobId;
      clearTimeoutRef.current = setTimeout(() => {
        setCurrentJobId(prev => {
          // Only clear if it's still the same job
          if (prev === completedJobId) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
          }
          return prev;
        });
        clearTimeoutRef.current = null;
      }, 30000);
    }
  };

  const handleDeleteRun = (e: React.MouseEvent, runId: string) => {
    e.stopPropagation(); // Prevent navigation to run detail
    setRunToDelete(runId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!runToDelete) return;

    try {
      const response = await fetch(`http://localhost:3001/api/runs/${runToDelete}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        refetch(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to delete run:', error);
    } finally {
      setDeleteModalOpen(false);
      setRunToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setRunToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading runs...</div>
      </div>
    );
  }

  const contractMissing = system?.contract?.state === 'missing';
  const cacheMissing = system?.cache?.state === 'missing';
  const cannotRun = contractMissing || cacheMissing;

  // Filter runs based on selected filter
  const filteredRuns = runs?.filter(run => {
    if (filter === 'passed') return run.exitCode === 0;
    if (filter === 'failed') return run.exitCode !== 0;
    return true; // 'all'
  }) || [];

  // Calculate counts for filter bar
  const counts = {
    total: runs?.length || 0,
    passed: runs?.filter(r => r.exitCode === 0).length || 0,
    failed: runs?.filter(r => r.exitCode !== 0).length || 0
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6" data-testid="runs-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" data-testid="runs-page-title">Runs</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Test execution history</p>
        </div>
        <button
          data-testid="runs-button-run-tests"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          onClick={handleRunTests}
          disabled={isJobRunning || cannotRun}
          title={
            isJobRunning
              ? 'Test run in progress'
              : cannotRun
              ? 'Contract and Cache required to run tests'
              : ''
          }
        >
          {isJobRunning ? 'Test Running...' : 'Run Tests'}
        </button>
      </div>

      {/* Prerequisites Warning */}
      {cannotRun && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4" data-testid="runs-prerequisites-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-yellow-900">Prerequisites Required</p>
              <p className="text-sm text-yellow-800 mt-1">
                Complete these steps before running tests:
              </p>
              <ol className="text-sm text-yellow-800 mt-2 space-y-1 list-decimal list-inside">
                <li className={contractMissing ? 'font-medium' : 'line-through opacity-60'}>
                  {contractMissing ? (
                    <Link to="/contract" className="hover:underline">
                      Generate Contract →
                    </Link>
                  ) : (
                    'Generate Contract ✓'
                  )}
                </li>
                <li className={cacheMissing ? 'font-medium' : 'line-through opacity-60'}>
                  {cacheMissing ? (
                    <Link to="/cache" className="hover:underline">
                      Build Cache →
                    </Link>
                  ) : (
                    'Build Cache ✓'
                  )}
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Job Status */}
      {currentJobId && (
        <JobStatusCard jobId={currentJobId} onComplete={handleJobComplete} />
      )}

      {!runs || runs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center" data-testid="runs-empty-state">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Play size={32} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No Test Runs Yet</h3>
            <p className="text-sm text-gray-600 max-w-md">
              Your test execution history will appear here. {system?.contract.state === 'available' && system?.cache.state === 'available' ? 'Click "Run Tests" above to start your first test execution.' : 'Complete the prerequisites above, then run your tests.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Run Filter Bar */}
          <RunFilterBar
            currentFilter={filter}
            onFilterChange={setFilter}
            counts={counts}
          />

          {/* Runs Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]" data-testid="runs-table">
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRuns.map((run) => (
                <tr
                  key={run.runId}
                  data-testid={`runs-row-${run.runId}`}
                  className="hover:bg-blue-50 transition-colors"
                >
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                    onClick={() => navigate(`/runs/${run.runId}`)}
                  >
                    {run.runName}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer"
                    onClick={() => navigate(`/runs/${run.runId}`)}
                  >
                    {formatDistanceToNow(new Date(run.timestamp), { addSuffix: true })}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => navigate(`/runs/${run.runId}`)}
                  >
                    <ExitCodeBadge
                      code={run.exitCode}
                      size="sm"
                      testsPassed={run.testsPassed}
                      testsFailed={run.testsFailed}
                    />
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm cursor-pointer"
                    onClick={() => navigate(`/runs/${run.runId}`)}
                  >
                    {run.testsPassed === 0 && run.testsFailed === 0 ? (
                      <span className="text-yellow-600 font-medium">No tests found</span>
                    ) : (
                      <span className="text-gray-600">
                        {run.testsPassed} passed / {run.testsFailed} failed
                      </span>
                    )}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer"
                    onClick={() => navigate(`/runs/${run.runId}`)}
                  >
                    {(run.duration / 1000).toFixed(1)}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      data-testid={`runs-button-delete-${run.runId}`}
                      onClick={(e) => handleDeleteRun(e, run.runId)}
                      className="text-red-600 hover:text-red-800 transition-colors p-2 hover:bg-red-50 rounded"
                      title="Delete run"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={cancelDelete}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Test Run</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to delete this test run? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={cancelDelete}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default RunsPage;
