import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useRunDetail(runId: string) {
  return useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getRunDetail(runId),
    enabled: !!runId
  });
}
