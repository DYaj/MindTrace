import { useJobStatus } from '../hooks/useJobStatus';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import type { JobStatus } from '@breakline/ui-types';

interface JobStatusCardProps {
  jobId: string | null;
  onComplete?: (job: JobStatus) => void;
}

/**
 * JobStatusCard - Display live job status with polling
 *
 * Shows:
 * - Job type and status
 * - Duration (live for running jobs)
 * - Result summary when completed
 *
 * Polls every 2s until job completes or fails.
 */
export function JobStatusCard({ jobId, onComplete }: JobStatusCardProps) {
  const { data: job, isLoading, error } = useJobStatus(jobId);

  // Call onComplete callback when job finishes
  if (job && (job.status === 'completed' || job.status === 'failed') && onComplete) {
    onComplete(job);
  }

  // If job not found (stale jobId), silently return null
  if (error) {
    console.log('Job not found, likely stale job ID');
    return null;
  }

  if (!jobId || isLoading || !job) {
    return null;
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      label: 'Pending'
    },
    running: {
      icon: Loader2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: 'Running'
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: 'Completed'
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: 'Failed'
    }
  };

  const config = statusConfig[job.status];
  const Icon = config.icon;

  const typeLabels = {
    'run': 'Run',
    'generate-contract': 'Contract Generation',
    'build-cache': 'Cache Build'
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={`border rounded-lg p-4 ${config.bg} ${config.border}`} data-testid={`job-status-card-${jobId}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Icon
            className={`${config.color} ${job.status === 'running' ? 'animate-spin' : ''}`}
            size={24}
          />
          <div>
            <p className="font-semibold text-gray-900">
              {typeLabels[job.type]}
            </p>
            <p className={`text-sm ${config.color}`}>
              {config.label}
            </p>
          </div>
        </div>

        {job.duration && (
          <div className="text-sm text-gray-600">
            {formatDuration(job.duration)}
          </div>
        )}
      </div>

      {/* Result summary */}
      {job.status === 'completed' && job.result && (
        <div className="mt-3 pt-3 border-t border-green-200">
          {job.result.stdout && (
            <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 space-y-1">
              {job.result.stdout.split('\n').map((line, idx) => {
                // Check if line contains a label-value pair (e.g., "   - Run folder:   /path")
                const match = line.match(/^(\s*-\s+[^:]+:)\s*(.+)$/);
                if (match) {
                  const [, label, value] = match;
                  return (
                    <div key={idx} className="grid grid-cols-[auto_1fr] gap-2">
                      <span className="whitespace-pre text-right">{label}</span>
                      <span className="break-all min-w-0">{value}</span>
                    </div>
                  );
                }
                // Regular line without special formatting
                return <div key={idx} className="whitespace-pre-wrap">{line}</div>;
              })}
            </div>
          )}
          {job.result.runId && (
            <p className="text-sm font-medium text-gray-900 mt-2">Run ID: {job.result.runId}</p>
          )}
        </div>
      )}

      {job.status === 'failed' && job.result?.error && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <p className="text-sm text-red-700">{job.result.error}</p>
        </div>
      )}
    </div>
  );
}
