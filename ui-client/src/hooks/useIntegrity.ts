import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useIntegrity() {
  return useQuery({
    queryKey: ['integrity'],
    queryFn: api.getIntegrity
  });
}
