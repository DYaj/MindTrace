import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useSystemStatus() {
  return useQuery({
    queryKey: ['system', 'status'],
    queryFn: api.getSystemStatus,
    refetchInterval: 5000 // Refresh every 5 seconds
  });
}
