import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useContract() {
  return useQuery({
    queryKey: ['contract'],
    queryFn: api.getContract
  });
}
