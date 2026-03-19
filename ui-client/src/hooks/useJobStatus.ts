import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/**
 * Hook to poll job status until completion
 *
 * Polls every 2 seconds while job is pending or running.
 * Stops polling when job is completed or failed.
 */
export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Stop polling if job is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      // Poll every 2 seconds for pending/running jobs
      return 2000;
    },
    // Keep data fresh
    staleTime: 0
  });
}
